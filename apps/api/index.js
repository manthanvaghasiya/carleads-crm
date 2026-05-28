// ============================================================
// CarLeads CRM — Express.js API Server
// AI-powered lead management for Indian car dealers
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// Rate limiting (100 req/min)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'carleads-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mock_mode: !process.env.SUPABASE_URL,
  });
});

// ── Routes ─────────────────────────────────────────────────
const leadsRouter = require('./routes/leads');
const statsRouter = require('./routes/stats');
const whatsappWebhook = require('./routes/webhooks/whatsapp');
const instagramWebhook = require('./routes/webhooks/instagram');

app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/webhooks/whatsapp', whatsappWebhook);
app.use('/api/v1/webhooks/instagram', instagramWebhook);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🚗 CarLeads CRM API Server');
  console.log('═══════════════════════════════════════════════');
  console.log(`  ▸ Port:        ${PORT}`);
  console.log(`  ▸ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ▸ Mock Mode:   ${!process.env.SUPABASE_URL ? 'YES (no Supabase)' : 'NO'}`);
  console.log(`  ▸ AI Scoring:  ${process.env.ANTHROPIC_API_KEY ? 'Claude API' : 'Keyword fallback'}`);
  console.log(`  ▸ WhatsApp:    ${process.env.WHATSAPP_TOKEN ? 'Connected' : 'Mock mode'}`);
  console.log('───────────────────────────────────────────────');
  console.log(`  ▸ Health:      http://localhost:${PORT}/api/health`);
  console.log(`  ▸ Leads:       http://localhost:${PORT}/api/v1/leads`);
  console.log(`  ▸ Stats:       http://localhost:${PORT}/api/v1/stats/overview`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
