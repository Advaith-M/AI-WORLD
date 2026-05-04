export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const r = await fetch(url, options);
      const d = await r.json();
      
      if (d.error) return `Error from ${type}: ${d.error.message || d.error}`;
      
      if (type === 'GPT') return d.choices[0].message.content;
      // Gemini 1.5 Flash is now the standard fast model
      if (type === 'GEMINI') return d.candidates[0].content.parts[0].text;
      // Llama 3 is the current recommended replacement for Mixtral on Groq
      if (type === 'GROQ') return d.choices[0].message.content;
    } catch (e) {
      return `${type} Connection Failed: ${e.message}`;
    }
  };

  // 1. OpenAI - Still requires credits, but we'll keep it ready
  const gpt = await getAI('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] })
  }, 'GPT');

  // 2. Gemini - Updated to Gemini 1.5 Flash (most compatible)
  const gemini = await getAI(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, 'GEMINI');

  // 3. Groq - Updated to Llama 3 (the Mixtral replacement)
  const groq = await getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: prompt }] })
  }, 'GROQ');

  res.status(200).json({ gpt, gemini, groq });
}
