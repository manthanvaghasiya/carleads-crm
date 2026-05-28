// ============================================================
// WhatsApp Cloud API Service
// Sends messages via Meta Cloud API
// Falls back to console logging in mock mode
// ============================================================

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Send a WhatsApp text message via Meta Cloud API
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} text - Message text
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
async function sendMessage(phone, text) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`📱 [MOCK WhatsApp] To: ${phone}`);
    console.log(`   Message: ${text}`);
    return { success: true, messageId: `mock_${Date.now()}`, mock: true };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return { success: false, error: data.error?.message || 'Unknown error' };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id || null,
    };
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
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
