// ============================================================
// Mock Stats Data — Dashboard numbers for CarLeads CRM
// ============================================================

const mockOverview = {
  totalLeadsToday: 23,
  hotLeadsToday: 5,
  responseRate: 68,
  fakePercentage: 35,
};

const mockByPlatform = [
  { platform: 'whatsapp', count: 15, color: '#25D366' },
  { platform: 'instagram', count: 6, color: '#E1306C' },
  { platform: 'manual', count: 2, color: '#6B7280' },
];

const mockScoreDistribution = [
  { range: '1-3', label: 'Fake / Spam', count: 8, color: '#EF4444' },
  { range: '4-6', label: 'Warm', count: 7, color: '#F59E0B' },
  { range: '7-10', label: 'Hot', count: 8, color: '#22C55E' },
];

const mockWeekly = [
  { day: 'Mon', date: _daysAgo(6), leads: 18 },
  { day: 'Tue', date: _daysAgo(5), leads: 22 },
  { day: 'Wed', date: _daysAgo(4), leads: 15 },
  { day: 'Thu', date: _daysAgo(3), leads: 28 },
  { day: 'Fri', date: _daysAgo(2), leads: 25 },
  { day: 'Sat', date: _daysAgo(1), leads: 12 },
  { day: 'Sun', date: _daysAgo(0), leads: 23 },
];

function _daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

module.exports = {
  mockOverview,
  mockByPlatform,
  mockScoreDistribution,
  mockWeekly,
};
