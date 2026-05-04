export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;

  // Function to handle individual AI calls safely
  async function safeCall(apiCall) {
    try {
      return await apiCall();
    } catch (e) {
      return "AI Service temporarily unavailable.";
    }
  }

  const gptResponse = await safeCall(async () => {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    return d.choices[0].message.content;
  });

  const geminiResponse = await safeCall(async () => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const d = await r.json();
    return d.candidates[0].content.parts[0].text;
  });

  const groqResponse = await safeCall(async () => {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "mixtral-8x7b-32768", messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    return d.choices[0].message.content;
  });

  res.status(200).json({ gpt: gptResponse, gemini: geminiResponse, groq: groqResponse });
}
