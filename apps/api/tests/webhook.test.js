const request = require('supertest');
const express = require('express');

// Mock env vars before requiring route
process.env.TWILIO_AUTH_TOKEN = 'test_token';

// Mock twilio module
jest.mock('twilio', () => {
  return {
    validateRequest: jest.fn((token, sig, url, body) => {
      return sig === 'valid_signature';
    }),
    twiml: {
      MessagingResponse: class {
        toString() {
          return '<Response></Response>';
        }
      }
    }
  };
});

const whatsappRoute = require('../routes/webhooks/whatsapp');

// Setup mock app
const app = express();
// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/webhooks/whatsapp', whatsappRoute);

describe('WhatsApp Webhook (Twilio)', () => {

  describe('POST Messages', () => {
    const validPayload = {
      From: 'whatsapp:+1234567890',
      Body: 'score: Honda City 2022, 8 lakh budget',
      MessageSid: 'SM12345',
      ProfileName: 'Test User'
    };

    test('Invalid signature → 403', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-twilio-signature', 'invalid_signature')
        .type('form')
        .send(validPayload);
      
      expect(res.status).toBe(403);
    });

    test('Valid message → returns 200 with TwiML', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-twilio-signature', 'valid_signature')
        .type('form')
        .send(validPayload);
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('<Response></Response>');
      expect(res.headers['content-type']).toContain('text/xml');
    });

    test('Missing fields → 400', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .set('x-twilio-signature', 'valid_signature')
        .type('form')
        .send({ From: 'whatsapp:+1234567890' }); // Missing Body
      
      expect(res.status).toBe(400);
    });
  });
});
