// ============================================================
// WhatsApp Webhook Routes
// Handles Meta webhook verification and incoming messages
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { supabase, isMockMode } = require('../../lib/supabase');
const { mockLeads, mockMessages } = require('../../data/mockLeads');
const { scoreLeadMessage } = require('../../services/scorer');
const { notifyHotLead } = require('../../services/notification');

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'carleads_verify_token';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// ── GET — Meta webhook verification ────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('❌ WhatsApp webhook verification failed');
  return res.sendStatus(403);
});

// ── POST — Incoming message handler ────────────────────────
router.post('/', async (req, res) => {
  try {
    // Verify signature if token is set
    if (WHATSAPP_TOKEN && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      
      // Use rawBody if available, otherwise fallback to stringified body
      const payload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
      
      const expectedSignature =
        'sha256=' +
        crypto
          .createHmac('sha256', WHATSAPP_TOKEN)
          .update(payload)
          .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️  Invalid WhatsApp webhook signature');
        return res.sendStatus(403);
      }
    }

    // Always return 200 immediately after security checks
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;

    // Validate it's a WhatsApp messages webhook
    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          // Only handle text messages for now
          if (message.type !== 'text') continue;

          const senderPhone = message.from;
          const messageText = message.text?.body || '';
          const messageId = message.id;
          const timestamp = message.timestamp;

          // Get sender name from contacts
          const contact = contacts.find((c) => c.wa_id === senderPhone);
          const senderName = contact?.profile?.name || 'Unknown';

          console.log(`📩 WhatsApp message from ${senderName} (${senderPhone}): ${messageText.substring(0, 50)}`);

          // Process the message
          await _processIncomingMessage({
            platform: 'whatsapp',
            senderName,
            senderPhone: `+${senderPhone}`,
            senderHandle: null,
            messageText,
            externalMessageId: messageId,
            timestamp: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err);
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
