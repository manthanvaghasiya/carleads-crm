// ============================================================
// AI Lead Scoring Service
// Uses Claude API for Hinglish car dealer message analysis
// Falls back to keyword-based scoring when API key is unavailable
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Score a lead message using Gemini AI or keyword-based fallback
 * @param {string} messageText - The message from the potential buyer
 * @returns {{ score: number, tag: string, reason: string, signals: string[] }}
 */
async function scoreLeadMessage(messageText) {
  if (!messageText || messageText.trim().length === 0) {
    return { score: 1, tag: 'fake', reason: 'Empty message', signals: ['empty_message'] };
  }

  // If Gemini API key is configured, use Gemini
  if (GEMINI_API_KEY) {
    try {
      return await _scoreWithGemini(messageText);
    } catch (err) {
      console.error('Gemini scoring failed, using fallback:', err.message);
      return _scoreWithKeywords(messageText);
    }
  }

  // Fallback: keyword-based scoring
  return _scoreWithKeywords(messageText);
}

/**
 * Score using Gemini API
 */
async function _scoreWithGemini(messageText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const scoringPrompt = `You are an AI lead scorer for an Indian used car dealer. Analyze this customer message and rate their buying intent.

Message: "${messageText}"

Score from 1-10 where:
- 1-3: Fake/spam/no intent (greetings, spam, wrong number, generic)
- 4-6: Warm lead (some interest but vague, no specific model or budget)
- 7-10: Hot lead (specific car model, budget mentioned, visit intent, ready to buy)

The message may be in Hinglish (Hindi+English mix). Look for signals like:
- Specific car model names (Swift, i20, Creta, City, Nexon, Baleno etc.)
- Budget/price mentions (lakh, budget, kitne ka)
- Visit intent (aa sakta hoon, showroom, kal aaunga)
- Finance/payment terms (EMI, finance, cash, down payment)
- Urgency (aaj, abhi, jaldi)
- Location mentions (city names)

Respond ONLY with valid JSON:
{"score": <number>, "tag": "<hot|warm|fake>", "reason": "<one line explanation>", "signals": ["signal1", "signal2"]}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: scoringPrompt }] }],
          generationConfig: { maxOutputTokens: 200 }
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.trim();
    const cleanText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    // Parse the JSON response
    const result = JSON.parse(cleanText);

    // Validate and normalize
    const score = Math.min(10, Math.max(1, Math.round(result.score)));
    let tag = result.tag;
    if (!['hot', 'warm', 'fake'].includes(tag)) {
      tag = score >= 7 ? 'hot' : score >= 4 ? 'warm' : 'fake';
    }

    return {
      score,
      tag,
      reason: result.reason || 'AI scored',
      signals: Array.isArray(result.signals) ? result.signals : [],
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn('Gemini API timed out after 3s');
    }
    // Fallback on any error
    return { score: 5, tag: 'warm', reason: 'AI scoring unavailable', signals: [] };
  }
}

/**
 * Keyword-based fallback scoring (works without API key)
 */
function _scoreWithKeywords(messageText) {
  const text = messageText.toLowerCase();
  let score = 3;
  const signals = [];

  // ── Spam / fake signals (reduce score) ───────────────────
  const spamPatterns = [
    /earn.*daily/i, /click.*link/i, /bit\.ly/i, /guaranteed.*returns/i,
    /follow\s*back/i, /wrong\s*number/i, /crypto/i, /invest/i,
  ];
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      signals.push('spam');
      return { score: 1, tag: 'fake', reason: 'Spam or irrelevant message detected', signals };
    }
  }

  // Generic greetings only
  if (/^(hello|hi|hey|good\s*morning|namaste|jai\s*shree?\s*krishna)\s*[🙏!.]*$/i.test(text.trim())) {
    signals.push('generic_greeting');
    return { score: 2, tag: 'fake', reason: 'Generic greeting with no car interest', signals };
  }

  // ── Positive signals (increase score) ────────────────────
  // Specific car models
  const carModels = [
    'swift', 'baleno', 'dzire', 'wagon ?r', 'wagonr', 'alto', 'brezza', 'vitara',
    'ertiga', 'ciaz', 'xl6', 's-cross', 'ignis', 'celerio', 'fronx', 'jimny',
    'i10', 'i20', 'verna', 'creta', 'venue', 'tucson', 'alcazar', 'exter',
    'city', 'amaze', 'jazz', 'wrv', 'wr-v', 'elevate',
    'nexon', 'punch', 'harrier', 'safari', 'tiago', 'tigor', 'altroz',
    'seltos', 'sonet', 'carens', 'fortuner', 'innova', 'glanza', 'urban cruiser',
    'polo', 'vento', 'taigun', 'virtus', 'kushaq', 'slavia',
    'xuv300', 'xuv700', 'thar', 'scorpio', 'bolero', 'magnite', 'kicks',
  ];
  for (const model of carModels) {
    if (new RegExp(`\\b${model}\\b`, 'i').test(text)) {
      score += 3;
      signals.push('specific_model');
      break;
    }
  }

  // Budget / price mentions
  if (/\b(budget|lakh|lac|price|kitne|kitna|kya rate|amount)\b/i.test(text)) {
    score += 2;
    signals.push('budget_mentioned');
  }

  // Visit intent
  if (/\b(aa\s*(sakta|jaunga|raha)|showroom|visit|dekhne|test\s*drive|kal\s*aa|aaj\s*aa|milte)\b/i.test(text)) {
    score += 2;
    signals.push('visit_intent');
  }

  // Finance / payment
  if (/\b(finance|emi|loan|cash|down\s*payment|installment)\b/i.test(text)) {
    score += 1;
    signals.push('finance_intent');
  }

  // Urgency
  if (/\b(aaj|abhi|jaldi|urgent|turant|immediately|today|now)\b/i.test(text)) {
    score += 1;
    signals.push('urgency');
  }

  // Location
  if (/\b(surat|ahmedabad|vadodara|rajkot|gandhinagar|baroda|anand|bharuch|navsari|vapi|valsad|jamnagar|bhavnagar|junagadh)\b/i.test(text)) {
    score += 1;
    signals.push('location_shared');
  }

  // Variant / fuel type
  if (/\b(petrol|diesel|cng|electric|ev|automatic|manual|amt|vxi|zxi|sportz|alpha|delta|sigma|lxi|vdi|zdi)\b/i.test(text)) {
    score += 1;
    signals.push('variant_specified');
  }

  // Exchange
  if (/\b(exchange|trade|purani|old\s*car|replace)\b/i.test(text)) {
    score += 1;
    signals.push('exchange_intent');
  }

  // Clamp score
  score = Math.min(10, Math.max(1, score));

  // Determine tag
  const tag = score >= 7 ? 'hot' : score >= 4 ? 'warm' : 'fake';

  // Generate reason
  let reason;
  if (tag === 'hot') {
    reason = `High intent — ${signals.join(', ')}`;
  } else if (tag === 'warm') {
    reason = `Some interest shown — ${signals.join(', ')}`;
  } else {
    reason = 'Low or no car purchase intent';
  }

  return { score, tag, reason, signals };
}

module.exports = { scoreLeadMessage };
