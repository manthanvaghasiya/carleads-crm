// ============================================================
// Instagram Webhook Routes
// Handles Meta webhook verification and incoming DMs
// ============================================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { supabase, isMockMode } = require('../lib/supabase');
const { mockLeads, mockMessages } = require('../data/mockLeads');
const { scoreLeadMessage } = require('../services/scorer');
const { notifyHotLead } = require('../services/notification');

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'carleads_verify_token';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

// ── GET — Meta webhook verification ────────────────────────
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Instagram webhook verification failed');
  return res.sendStatus(403);
});

// ── POST — Incoming message handler ────────────────────────
router.post('/', async (req, res) => {
  // Always return 200 immediately (Meta requires this)
  res.sendStatus(200);

  try {
    // Verify signature if app secret is set
    if (INSTAGRAM_APP_SECRET && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const expectedSignature =
        'sha256=' +
        crypto
          .createHmac('sha256', INSTAGRAM_APP_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️  Invalid Instagram webhook signature');
        return;
      }
    }

    const body = req.body;

    // Validate it's an Instagram messaging webhook
    if (body.object !== 'instagram') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const messaging = entry.messaging || [];

      for (const event of messaging) {
        // Only handle message events (not reactions, reads, etc.)
        if (!event.message || !event.message.text) continue;

        const senderId = event.sender?.id;
        const messageText = event.message.text;
        const messageId = event.message.mid;
        const timestamp = event.timestamp;

        // Instagram doesn't send sender name in webhook — use ID
        const senderName = `IG User ${senderId?.substring(0, 6) || 'Unknown'}`;
        const senderHandle = senderId ? `@ig_${senderId}` : null;

        console.log(`📩 Instagram DM from ${senderHandle}: ${messageText.substring(0, 50)}`);

        await _processIncomingMessage({
          platform: 'instagram',
          senderName,
          senderPhone: null,
          senderHandle,
          messageText,
          externalMessageId: messageId,
          timestamp: timestamp
            ? new Date(timestamp).toISOString()
            : new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Instagram webhook processing error:', err);
  }
});

/**
 * Process an incoming Instagram message — create lead, score, notify
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
      id: `ig_${Date.now()}`,
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

    console.log(`✅ IG Lead created: ${senderName} — Score: ${scoring.score}/10 (${scoring.tag})`);

    if (scoring.score >= 7) {
      await notifyHotLead(dealerId, newLead);
    }

    return;
  }

  // ── Supabase mode ─────────────────────────────────────────

  const { data: existing } = await supabase
    .from('lead_messages')
    .select('id')
    .eq('external_message_id', externalMessageId)
    .single();

  if (existing) {
    console.log('⏭️  Duplicate message, skipping:', externalMessageId);
    return;
  }

  const scoring = await scoreLeadMessage(messageText);

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
    console.error('Failed to create IG lead:', leadError.message);
    return;
  }

  const { error: msgError } = await supabase.from('lead_messages').insert({
    lead_id: lead.id,
    direction: 'inbound',
    content: messageText,
    sender_name: senderName,
    platform,
    external_message_id: externalMessageId,
  });

  if (msgError) {
    console.error('Failed to create IG message:', msgError.message);
  }

  console.log(`✅ IG Lead created: ${senderName} — Score: ${scoring.score}/10 (${scoring.tag})`);

  if (scoring.score >= 7) {
    await notifyHotLead(dealerId, lead);
  }
}

module.exports = router;
