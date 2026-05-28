// ============================================================
// Twilio WhatsApp API Service
// Sends messages via Twilio API
// Falls back to console logging in mock mode
// ============================================================

const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM?.trim();

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Send a WhatsApp text message via Twilio API
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} text - Message text
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
async function sendMessage(phone, text) {
  if (!twilioClient || !TWILIO_WHATSAPP_FROM) {
    console.log(`📱 [MOCK Twilio WhatsApp] To: ${phone}`);
    console.log(`   Message: ${text}`);
    return { success: true, messageId: `mock_${Date.now()}`, mock: true };
  }

  try {
    // Format the to number properly for Twilio WhatsApp
    // Assuming the phone string already has country code, e.g. "919876543210"
    let formattedPhone = phone.replace(/[^0-9+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    const message = await twilioClient.messages.create({
      body: text,
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${formattedPhone}`
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (err) {
    console.error('Twilio send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a hot lead alert to the dealer via WhatsApp
 * @param {{ phone: string, name: string }} dealer - Dealer info
 * @param {{ sender_name: string, platform: string, ai_score: number, message_preview: string }} lead - Lead info
 */
async function sendHotLeadAlert(dealer, lead) {
  const message = `🔥 *New Hot Lead Alert!*

👤 *Name:* ${lead.sender_name}
📱 *Platform:* ${lead.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
⭐ *AI Score:* ${lead.ai_score}/10
💬 *Message:* "${lead.message_preview.substring(0, 100)}"

${lead.ai_reason ? `🤖 *AI Says:* ${lead.ai_reason}` : ''}

⚡ Reply quickly to convert this lead!
— CarLeads CRM`;

  return sendMessage(dealer.phone, message);
}

module.exports = { sendMessage, sendHotLeadAlert };
