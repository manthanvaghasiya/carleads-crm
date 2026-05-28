// ============================================================
// Auth Middleware — Verify Supabase JWT or allow mock mode
// ============================================================

const { supabase, isMockMode } = require('../lib/supabase');
const { mockDealer } = require('../data/mockLeads');

async function authMiddleware(req, res, next) {
  // In mock mode with no token, use demo dealer
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isMockMode || process.env.NODE_ENV !== 'production') {
      // Development / mock mode — attach demo dealer
      req.dealer = {
        id: mockDealer.id,
        name: mockDealer.name,
        city: mockDealer.city,
        phone: mockDealer.phone,
      };
      return next();
    }
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  if (isMockMode) {
    // Mock mode but token was provided — still use demo dealer
    req.dealer = {
      id: mockDealer.id,
      name: mockDealer.name,
      city: mockDealer.city,
      phone: mockDealer.phone,
    };
    return next();
  }

  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up dealer info from the dealers table
    const { data: dealer, error: dealerError } = await supabase
      .from('dealers')
      .select('id, name, city, phone, whatsapp_number, subscription')
      .eq('user_id', user.id)
      .single();

    if (dealerError || !dealer) {
      return res.status(403).json({ error: 'Dealer profile not found' });
    }

    req.dealer = dealer;
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = authMiddleware;
