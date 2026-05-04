export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const r = await fetch(url, options);
      const d = await r.json();
      
      if (d.error) return `Error from ${type}: ${d.error.message || d.error}`;
      
      if (type === 'GPT') return d.choices[0].message.content;
      if (type === 'GEMINI') return d.candidates[0].content.parts[0].text;
      if (type === 'GROQ') return d.choices[0].message.content;
    } catch (e) {
      return `${type} Connection Failed: ${e.message}`;
    }
  };

  // 1. OpenAI - Using the current mini-standard
  const gpt = await getAI('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] })
  }, 'GPT');

  // 2. GEMINI - Updated to Gemini 1.5 Pro (The high-power model)
  const gemini = await getAI(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, 'GEMINI');

  // 3. GROQ - Using the "3.1" 70B Version (The most powerful Llama 3.1)
  const groq = await getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama-3.1-70b-versatile", messages: [{ role: "user", content: prompt }] })
  }, 'GROQ');

  res.status(200).json({ gpt, gemini, groq });
}
