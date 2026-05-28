// ============================================================
// Stats Routes — Dashboard statistics endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase, isMockMode } = require('../lib/supabase');
const { mockLeads } = require('../data/mockLeads');
const {
  mockOverview,
  mockByPlatform,
  mockScoreDistribution,
  mockWeekly,
} = require('../data/mockStats');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ── GET /api/stats/overview — Key metrics ──────────────────
router.get('/overview', async (req, res) => {
  try {
    if (isMockMode) {
      return res.json(mockOverview);
    }

    const dealerId = req.dealer.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Total leads today
    const { count: totalLeadsToday } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .gte('created_at', todayStart.toISOString());

    // Hot leads today
    const { count: hotLeadsToday } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .eq('ai_tag', 'hot')
      .gte('created_at', todayStart.toISOString());

    // Response rate (contacted or follow_up out of total)
    const { count: respondedCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .in('status', ['contacted', 'follow_up', 'converted']);

    const { count: totalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId);

    const responseRate = totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0;

    // Fake percentage
    const { count: fakeCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', dealerId)
      .eq('ai_tag', 'fake');

    const fakePercentage = totalCount > 0 ? Math.round((fakeCount / totalCount) * 100) : 0;

    return res.json({
      totalLeadsToday: totalLeadsToday || 0,
      hotLeadsToday: hotLeadsToday || 0,
      responseRate,
      fakePercentage,
    });
  } catch (err) {
    console.error('GET /api/stats/overview error:', err);
    return res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

// ── GET /api/stats/by-platform — Platform breakdown ────────
router.get('/by-platform', async (req, res) => {
  try {
    if (isMockMode) {
      return res.json(mockByPlatform);
    }

    const dealerId = req.dealer.id;
    const { data, error } = await supabase
      .from('leads')
      .select('platform')
      .eq('dealer_id', dealerId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch platform stats' });
    }

    const platformColors = {
      whatsapp: '#25D366',
      instagram: '#E1306C',
      manual: '#6B7280',
      website: '#3B82F6',
    };

    const counts = {};
    for (const row of data || []) {
      counts[row.platform] = (counts[row.platform] || 0) + 1;
    }

    const result = Object.entries(counts).map(([platform, count]) => ({
      platform,
      count,
      color: platformColors[platform] || '#9CA3AF',
    }));

    return res.json(result);
  } catch (err) {
    console.error('GET /api/stats/by-platform error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// ── GET /api/stats/score-distribution — Score ranges ───────
router.get('/score-distribution', async (req, res) => {
  try {
    if (isMockMode) {
      return res.json(mockScoreDistribution);
    }

    const dealerId = req.dealer.id;
    const { data, error } = await supabase
      .from('leads')
      .select('ai_score')
      .eq('dealer_id', dealerId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch score stats' });
    }

    let fake = 0, warm = 0, hot = 0;
    for (const row of data || []) {
      const s = row.ai_score;
      if (s >= 7) hot++;
      else if (s >= 4) warm++;
      else fake++;
    }

    return res.json([
      { range: '1-3', label: 'Fake / Spam', count: fake, color: '#EF4444' },
      { range: '4-6', label: 'Warm', count: warm, color: '#F59E0B' },
      { range: '7-10', label: 'Hot', count: hot, color: '#22C55E' },
    ]);
  } catch (err) {
    console.error('GET /api/stats/score-distribution error:', err);
    return res.status(500).json({ error: 'Failed to fetch score stats' });
  }
});

// ── GET /api/stats/weekly — Last 7 days trend ──────────────
router.get('/weekly', async (req, res) => {
  try {
    if (isMockMode) {
      return res.json(mockWeekly);
    }

    const dealerId = req.dealer.id;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', dealerId)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      result.push({
        day: days[date.getDay()],
        date: date.toISOString().split('T')[0],
        leads: count || 0,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('GET /api/stats/weekly error:', err);
    return res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

module.exports = router;
