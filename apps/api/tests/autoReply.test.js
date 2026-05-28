process.env.GEMINI_API_KEY = 'test_key';
const { generateReply } = require('../services/autoReply');

// Mock fetch for Gemini API
global.fetch = jest.fn();

describe('AI Auto-Reply Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a reply for a warm lead', async () => {
    // Mock the Gemini API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Achha! Budget kitna hai aapka?' }]
            }
          }
        ]
      })
    });

    const conversationHistory = [
      { direction: 'inbound', message_text: 'hello' },
      { direction: 'outbound', message_text: 'Hi! Main Raj bol raha hoon. Kaun si car dekhna chahte hain aap?' },
      { direction: 'inbound', message_text: 'Swift 2019' }
    ];

    const reply = await generateReply(conversationHistory);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallArg = global.fetch.mock.calls[0][1].body;
    expect(fetchCallArg).toContain('Swift 2019');
    
    expect(reply).toBe('Achha! Budget kitna hai aapka?');
  });

  it('should return a fallback message if API fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const conversationHistory = [
      { direction: 'inbound', message_text: 'hello' }
    ];

    const reply = await generateReply(conversationHistory);

    expect(reply).toBe('Thank you for reaching out! Our team will contact you shortly to assist further.');
  });
});
