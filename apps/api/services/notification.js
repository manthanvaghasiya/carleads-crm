// ============================================================
// Notification Service
// Creates notifications in DB + sends WhatsApp alerts for hot leads
// ============================================================

const { supabase, isMockMode } = require('../lib/supabase');
const { sendHotLeadAlert } = require('./whatsapp');
const { mockDealer } = require('../data/mockLeads');

// In-memory notifications for mock mode
const mockNotifications = [];

/**
 * Create a notification for a hot lead and send WhatsApp alert
 * @param {string} dealerId - The dealer's ID
 * @param {object} lead - The lead object
 */
async function notifyHotLead(dealerId, lead) {
  const notification = {
    id: `notif_${Date.now()}`,
    dealer_id: dealerId,
    type: 'hot_lead',
    title: `🔥 Hot Lead: ${lead.sender_name}`,
    body: `Score ${lead.ai_score}/10 — "${lead.message_preview?.substring(0, 80)}"`,
    lead_id: lead.id,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (isMockMode) {
    // Store in memory
    mockNotifications.unshift(notification);
    console.log(`🔔 [MOCK Notification] ${notification.title}`);
  } else {
    // Store in DB
    try {
      const { error } = await supabase.from('notifications').insert(notification);
      if (error) {
        console.error('Failed to create notification:', error.message);
      }
    } catch (err) {
      console.error('Notification DB error:', err.message);
    }
  }

  // Send WhatsApp alert to dealer
  try {
    // Get dealer info
    let dealer;
    if (isMockMode) {
      dealer = mockDealer;
    } else {
      const { data } = await supabase
        .from('dealers')
        .select('phone, name')
        .eq('id', dealerId)
        .single();
      dealer = data;
    }

    if (dealer?.phone) {
      await sendHotLeadAlert(dealer, lead);
    }
  } catch (err) {
    console.error('WhatsApp alert failed:', err.message);
  }

  return notification;
}

/**
 * Get unread notifications for a dealer
 * @param {string} dealerId
 * @returns {Array} notifications
 */
async function getUnreadNotifications(dealerId) {
  if (isMockMode) {
    return mockNotifications.filter(
      (n) => n.dealer_id === dealerId && !n.is_read
    );
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch notifications:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Notification fetch error:', err.message);
    return [];
  }
}

module.exports = { notifyHotLead, getUnreadNotifications };
