process.env.GEMINI_API_KEY = 'test_key';
const { scoreLeadMessage } = require('../services/scorer');

// Mock global fetch so we don't make real network calls in tests
global.fetch = jest.fn((url, options) => {
  if (url.includes('generativelanguage.googleapis.com')) {
    const body = JSON.parse(options.body);
    const content = body.contents[0].parts[0].text.toLowerCase();
    
    const wrap = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

    // 1. Fake intent
    if (content.includes('score: hello') || content.includes('score: price?')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(wrap('{"score": 2, "tag": "fake", "reason": "No clear intent", "signals": []}'))
      });
    }
    
    // 2. Warm intent
    if (content.includes('score: koi acchi car hai')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(wrap('{"score": 5, "tag": "warm", "reason": "Vague interest", "signals": []}'))
      });
    }

    // 3. Hot intent
    if (content.includes('score: swift 2019 chahiye budget 4 lakh cash surat') || 
        content.includes('score: honda city 2022, 8 lakh budget, buying this week')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(wrap('{"score": 9, "tag": "hot", "reason": "High intent with specifics", "signals": ["budget", "model"]}'))
      });
    }

    // 4. Timeout scenario
    if (content.includes('score: timeout')) {
      return new Promise((resolve, reject) => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        setTimeout(() => reject(error), 100);
      });
    }

    // Default fallback
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(wrap('{"score": 5, "tag": "warm", "reason": "default", "signals": []}'))
    });
  }
  return Promise.resolve({ ok: false });
});

describe('AI Scoring Service', () => {
  
  test('"hello" → score <= 3, tag "fake"', async () => {
    const result = await scoreLeadMessage('score: hello');
    expect(result.score).toBeLessThanOrEqual(3);
    expect(result.tag).toBe('fake');
  });

  test('"price?" → score <= 3, tag "fake"', async () => {
    const result = await scoreLeadMessage('score: price?');
    expect(result.score).toBeLessThanOrEqual(3);
    expect(result.tag).toBe('fake');
  });

  test('"koi acchi car hai" → score 4-6, tag "warm"', async () => {
    const result = await scoreLeadMessage('score: koi acchi car hai');
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.score).toBeLessThanOrEqual(6);
    expect(result.tag).toBe('warm');
  });

  test('"Swift 2019 chahiye budget 4 lakh cash Surat" → score >= 8, tag "hot"', async () => {
    const result = await scoreLeadMessage('score: Swift 2019 chahiye budget 4 lakh cash Surat');
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.tag).toBe('hot');
  });

  test('"Honda City 2022, 8 lakh budget, buying this week" → score >= 8, tag "hot"', async () => {
    const result = await scoreLeadMessage('score: Honda City 2022, 8 lakh budget, buying this week');
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.tag).toBe('hot');
  });

  test('API timeout → returns {score:5, tag:"warm", reason:"AI unavailable"}', async () => {
    const result = await scoreLeadMessage('score: timeout');
    expect(result.score).toBe(5);
    expect(result.tag).toBe('warm');
    expect(result.reason).toBe('AI scoring unavailable');
  });

});
