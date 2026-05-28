const express = require('express');
const router = express.Router();

// GET /api/v1/settings/integrations
router.get('/integrations', (req, res) => {
  // Check if Twilio is configured
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );

  res.json({
    whatsapp: {
      provider: 'twilio',
      connected: hasTwilio,
      phoneNumber: process.env.TWILIO_WHATSAPP_FROM || null
    },
    instagram: {
      connected: false // Stub for now
    }
  });
});

// POST /api/v1/settings/simulate-lead
// Helper to simulate an inbound Twilio webhook for local testing
router.post('/simulate-lead', async (req, res) => {
  try {
    const { message, senderPhone, senderName } = req.body;
    
    // We send a direct POST to our own webhook route
    // But since Twilio webhook requires x-twilio-signature, we bypass it by calling the internal processing function directly.
    // Wait, let's just require the whatsapp.js route and use its exported handler or fetch locally.
    // Since fetch to localhost:3001/api/v1/webhooks/whatsapp would fail signature validation,
    // we'll just mock the request manually.
    
    const { _processIncomingMessage } = require('./webhooks/whatsapp');
    
    if (typeof _processIncomingMessage === 'function') {
      await _processIncomingMessage({
        platform: 'whatsapp',
        senderName: senderName || 'Demo User',
        senderPhone: senderPhone || '+1234567890',
        senderHandle: null,
        messageText: message || 'Hello, I am interested in buying a car.',
        externalMessageId: 'sim_' + Date.now(),
        timestamp: new Date().toISOString()
      });
      res.json({ success: true, message: 'Simulated lead created' });
    } else {
      res.status(500).json({ error: 'Internal processor not exported' });
    }
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message });
  }
});

const authMiddleware = require('../middleware/auth');
const { supabase, isMockMode } = require('../lib/supabase');

// PUT /api/v1/settings/ai-bot
// Toggles AI auto-reply on/off for the dealer
router.put('/ai-bot', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    if (isMockMode) {
      return res.json({ success: true, ai_bot_enabled: enabled });
    }

    const { error } = await supabase
      .from('dealers')
      .update({ ai_bot_enabled: enabled })
      .eq('id', req.dealer.id);

    if (error) {
      console.error('Update ai-bot setting error:', error);
      return res.status(500).json({ error: 'Failed to update setting' });
    }

    res.json({ success: true, ai_bot_enabled: enabled });
  } catch (err) {
    console.error('PUT /ai-bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
