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
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
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
  // Default dealer ID (in production, resolve from phone number ID)
  const dealerId = 'demo-dealer-1';

  if (isMockMode) {
    // Check idempotency
    const existingMsg = Object.values(mockMessages)
      .flat()
      .find((m) => m.external_message_id === externalMessageId);
    if (existingMsg) {
      console.log('⏭️  Duplicate message, skipping:', externalMessageId);
      return;
    }

    // Score the message
    const scoring = await scoreLeadMessage(messageText);

    // Create lead
    const newLead = {
      id: `wh_${Date.now()}`,
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
      created_at: timestamp,
    };
    mockLeads.unshift(newLead);

    // Create message
    const newMessage = {
      id: `msg_${Date.now()}`,
      lead_id: newLead.id,
      direction: 'inbound',
      content: messageText,
      sender_name: senderName,
      platform,
      external_message_id: externalMessageId,
      created_at: timestamp,
    };
    mockMessages[newLead.id] = [newMessage];

    console.log(`✅ Lead created: ${senderName} — Score: ${scoring.score}/10 (${scoring.tag})`);

    // Notify if hot lead
    if (scoring.score >= 7) {
      await notifyHotLead(dealerId, newLead);
    }

    return;
  }

  // ── Supabase mode ─────────────────────────────────────────

  // Check idempotency
  const { data: existing } = await supabase
    .from('lead_messages')
    .select('id')
    .eq('external_message_id', externalMessageId)
    .single();

  if (existing) {
    console.log('⏭️  Duplicate message, skipping:', externalMessageId);
    return;
  }

  // Score the message
  const scoring = await scoreLeadMessage(messageText);

  // Create lead
  const { data: lead, error: leadError } = await supabase
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
    })
    .select()
    .single();

  if (leadError) {
    console.error('Failed to create lead:', leadError.message);
    return;
  }

  // Create message
  const { error: msgError } = await supabase.from('lead_messages').insert({
    lead_id: lead.id,
    direction: 'inbound',
    content: messageText,
    sender_name: senderName,
    platform,
    external_message_id: externalMessageId,
  });

  if (msgError) {
    console.error('Failed to create message:', msgError.message);
  }

  console.log(`✅ Lead created: ${senderName} — Score: ${scoring.score}/10 (${scoring.tag})`);

  // Notify if hot lead
  if (scoring.score >= 7) {
    await notifyHotLead(dealerId, lead);
  }
}

module.exports = router;
