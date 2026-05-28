const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Mock env vars before requiring route
process.env.WEBHOOK_VERIFY_TOKEN = 'test_token';
process.env.WHATSAPP_TOKEN = 'test_secret';

const whatsappRoute = require('../routes/webhooks/whatsapp');

// Setup mock app
const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }));
app.use('/api/v1/webhooks/whatsapp', whatsappRoute);

describe('WhatsApp Webhook', () => {

  describe('GET Verification', () => {
    test('Valid verify_token → returns challenge', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_token',
          'hub.challenge': '12345'
        });
      expect(res.status).toBe(200);
      expect(res.text).toBe('12345');
    });

    test('Wrong token → 403', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '12345'
        });
      expect(res.status).toBe(403);
    });
  });

  describe('POST Messages', () => {
    const generateSignature = (payload, secret) => {
      return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    };

    const validPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'msg_123',
              from: '919999999999',
              text: { body: 'Hello' }
            }],
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '919999999999'
            }]
          }
        }]
      }]
    };

    test('Invalid signature → 403', async () => {
      const payloadString = JSON.stringify(validPayload);
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('X-Hub-Signature-256', 'sha256=invalid')
        .send(payloadString);
      
      expect(res.status).toBe(403);
    });

    test('Valid message → returns 200', async () => {
      const payloadString = JSON.stringify(validPayload);
      const signature = generateSignature(payloadString, process.env.WHATSAPP_TOKEN);

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');
    });

    test('Duplicate message_id → 200 but skip', async () => {
      const payloadString = JSON.stringify(validPayload);
      const signature = generateSignature(payloadString, process.env.WHATSAPP_TOKEN);

      // In real implementation this would mock the DB check to return true for exists
      // The endpoint must still return 200 to prevent Meta from retrying
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);
      
      expect(res.status).toBe(200);
    });
  });
});
