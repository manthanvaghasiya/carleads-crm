// ============================================================
// Twilio WhatsApp Webhook Routes
// Handles Twilio webhook verification and incoming messages
// ============================================================

const express = require('express');
const twilio = require('twilio');
const router = express.Router();
const { supabase, isMockMode } = require('../../lib/supabase');
const { mockLeads, mockMessages } = require('../../data/mockLeads');
const { scoreLeadMessage } = require('../../services/scorer');
const { notifyHotLead } = require('../../services/notification');

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Add urlencoded parser specifically for Twilio webhooks
router.use(express.urlencoded({ extended: true }));

// ── POST — Incoming message handler ────────────────────────
router.post('/', async (req, res) => {
  try {
    // Validate request signature from Twilio
    if (TWILIO_AUTH_TOKEN && req.headers['x-twilio-signature']) {
      const twilioSignature = req.headers['x-twilio-signature'];
      // e.g. https://my-domain.ngrok-free.app/api/v1/webhooks/whatsapp
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
      
      const isValid = twilio.validateRequest(
        TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        req.body
      );

      if (!isValid) {
        console.warn('⚠️  Invalid Twilio webhook signature');
        return res.status(403).send('Invalid signature');
      }
    }

    const { From, Body, MessageSid, ProfileName } = req.body;

    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    // Twilio sends From as "whatsapp:+1234567890"
    const senderPhone = From.replace('whatsapp:', '');
    const messageText = Body;
    const messageId = MessageSid;
    const senderName = ProfileName || 'Unknown';
    const timestamp = new Date().toISOString();

    console.log(`📩 WhatsApp message from ${senderName} (${senderPhone}): ${messageText.substring(0, 50)}`);

    // Process the message
    await _processIncomingMessage({
      platform: 'whatsapp',
      senderName,
      senderPhone,
      senderHandle: null,
      messageText,
      externalMessageId: messageId,
      timestamp,
    });

    // Twilio expects a TwiML response (even an empty one)
    const MessagingResponse = twilio.twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    console.error('Twilio webhook processing error:', err);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Process an incoming message — create lead, score, notify
 */
async function _processIncomingMessage({
  platform,
  senderName,
  senderPhone,
  senderHandle,
  messageText,
  externalMessageId,
  timestamp,
}) {
  const { generateReply } = require('../../services/autoReply');
  const { sendMessage } = require('../../services/whatsapp');

  // For MVP, get the most recently created dealer
  const { data: dealers } = await supabase
    .from('dealers')
    .select('id, ai_bot_enabled')
    .order('created_at', { ascending: false })
    .limit(1);
  const dealer = dealers?.[0];
  const dealerId = dealer?.id || '3769eed5-e4f7-443a-bc72-b2e9e1e9b779';
  const aiBotEnabled = dealer?.ai_bot_enabled ?? true;

  if (isMockMode) {
    console.log('Skipping mock mode logic for AI Chatbot implementation.');
    return;
  }

  // ── Supabase mode ─────────────────────────────────────────

  // Check idempotency
  const { data: existingMsg } = await supabase
    .from('lead_messages')
    .select('id')
    .eq('platform_message_id', externalMessageId)
    .single();

  if (existingMsg) {
    console.log('⏭️  Duplicate message, skipping:', externalMessageId);
    return;
  }

  // Score the incoming message
  const scoring = await scoreLeadMessage(messageText);

  // Check if lead already exists
  let { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('dealer_id', dealerId)
    .eq('sender_phone', senderPhone)
    .single();

  let isNewLead = false;

  if (!lead) {
    // Create new lead
    isNewLead = true;
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        dealer_id: dealerId,
        platform,
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_handle: senderHandle,
        message_preview: messageText.substring(0, 200),
        ai_score: scoring.score,
        ai_tag: scoring.tag,
        ai_reason: scoring.reason,
        ai_signals: scoring.signals,
        status: 'new',
        is_read: false,
        auto_reply_active: aiBotEnabled,
        auto_reply_count: 0
      })
      .select()
      .single();

    if (leadError) {
      console.error('Failed to create lead:', leadError.message);
      return;
    }
    lead = newLead;
  } else {
    // Update existing lead preview and score
    const newScore = Math.max(lead.ai_score || 0, scoring.score);
    const newTag = newScore >= 7 ? 'hot' : newScore >= 4 ? 'warm' : 'fake';
    
    await supabase.from('leads').update({
      message_preview: messageText.substring(0, 200),
      ai_score: newScore,
      ai_tag: newTag,
      updated_at: new Date().toISOString()
    }).eq('id', lead.id);
    lead.ai_score = newScore;
    lead.ai_tag = newTag;
  }

  // Create inbound message
  const { error: msgError } = await supabase.from('lead_messages').insert({
    lead_id: lead.id,
    direction: 'inbound',
    message_text: messageText,
    platform_message_id: externalMessageId,
  });

  if (msgError) {
    console.error('Failed to create message:', msgError.message);
  }

  console.log(`✅ Message saved: ${senderName} — Score: ${scoring.score}/10 (${scoring.tag})`);

  // ── AI Auto-Reply Logic ──
  
  // Stop if buyer says exit words
  const exitWords = /^(ok|okay|thank you|thanks|bye|dhanyawad|thik hai)$/i;
  let manualStop = false;
  if (exitWords.test(messageText.trim())) {
    manualStop = true;
  }

  if (lead.auto_reply_active) {
    let replyText = null;
    let handoff = false;

    if (manualStop || lead.ai_score >= 7 || lead.auto_reply_count >= 5) {
      // Handoff to dealer
      handoff = true;
      replyText = "Our team will contact you shortly!";
    } else if (lead.ai_score <= 3 && isNewLead) {
      // Fake lead - end conversation early
      handoff = true;
      replyText = "Thank you for reaching out! We'll be in touch.";
    } else {
      // Warm lead - qualify further using Gemini
      // Fetch history
      const { data: history } = await supabase
        .from('lead_messages')
        .select('direction, message_text')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      const formattedHistory = (history || []).reverse();
      replyText = await generateReply(formattedHistory);
      
      // If Gemini decides it's done
      if (replyText.toLowerCase().includes("team will contact") || replyText.toLowerCase().includes("shortly")) {
        handoff = true;
      }
    }

    if (replyText) {
      // Send outbound message
      const sendRes = await sendMessage(senderPhone, replyText);
      if (sendRes.success) {
        // Save outbound message
        await supabase.from('lead_messages').insert({
          lead_id: lead.id,
          direction: 'outbound',
          message_text: replyText,
          platform_message_id: sendRes.messageId || `auto_${Date.now()}`
        });

        // Update lead state
        await supabase.from('leads').update({
          auto_reply_active: !handoff,
          auto_reply_count: (lead.auto_reply_count || 0) + 1,
          updated_at: new Date().toISOString()
        }).eq('id', lead.id);
      }
    }

    // Alert dealer ONLY if handoff just happened (or if hot lead)
    if (handoff || lead.ai_score >= 7) {
      await notifyHotLead(dealerId, lead);
    }
  } else {
    // If auto-reply is NOT active but the lead hits hot score, alert dealer
    if (lead.ai_score >= 7) {
      await notifyHotLead(dealerId, lead);
    }
  }
}

module.exports = router;
module.exports._processIncomingMessage = _processIncomingMessage;
