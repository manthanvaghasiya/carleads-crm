// ============================================================
// AI Chatbot Auto-Reply Service
// Uses Gemini API to act as Raj and qualify leads via text
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Generate a conversational reply using Gemini based on history
 * @param {Array<{direction: string, message_text: string}>} history - Last messages
 * @returns {Promise<string>}
 */
async function generateReply(history) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  No GEMINI_API_KEY found, falling back to static reply.');
    return 'Thank you for reaching out! Our team will contact you shortly to assist further.';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    // Format conversation history for Gemini Prompt
    const formattedHistory = history
      .map(msg => `${msg.direction === 'inbound' ? 'Buyer' : 'Raj'}: "${msg.message_text}"`)
      .join('\n');

    const systemPrompt = `You are Raj, a helpful assistant for an Indian car dealership.
Your job is to qualify buyers by asking smart questions.
Always reply in the same language the buyer uses (Hindi/English/Hinglish).
Be friendly, short replies only (max 2 lines).
Collect: car interest, budget, location, timeline.

Conversation goal:
1. Greet and ask what car they want
2. Ask budget
3. Ask location
4. Ask when they want to buy
5. Once all collected → say "Our team will contact you shortly!"

Never mention you are an AI.
Keep replies natural like a real person texting.

Here is the conversation history:
${formattedHistory}

Raj:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { 
            maxOutputTokens: 1000,
            temperature: 0.7 
          }
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    let replyText = data.candidates[0].content.parts[0].text.trim();
    
    // Clean up if Gemini accidentally prefixed with "Raj: " or quotes
    replyText = replyText.replace(/^Raj:\s*/i, '').replace(/^"|"$/g, '').trim();

    return replyText;
  } catch (err) {
    clearTimeout(timeout);
    console.error('Auto-Reply generation failed:', err.message);
    return 'Thank you for reaching out! Our team will contact you shortly to assist further.';
  }
}

module.exports = { generateReply };
