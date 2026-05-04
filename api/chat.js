export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const r = await fetch(url, options);
      const d = await r.json();
      
      // Handle different error formats for each AI
      if (d.error) return `Error from ${type}: ${d.error.message || d.error}`;
      if (d.error_message) return `Error from ${type}: ${d.error_message}`;
      
      if (type === 'GPT') return d.choices[0].message.content;
      if (type === 'GEMINI') return d.candidates[0].content.parts[0].text;
      if (type === 'GROQ') return d.choices[0].message.content;
    } catch (e) {
      return `${type} Connection Failed: ${e.message}`;
    }
  };

  const gpt = await getAI('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
  }, 'GPT');

  const gemini = await getAI(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, 'GEMINI');

  const groq = await getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "mixtral-8x7b-32768", messages: [{ role: "user", content: prompt }] })
  }, 'GROQ');

  res.status(200).json({ gpt, gemini, groq });
}
