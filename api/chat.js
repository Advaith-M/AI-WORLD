export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      // Set a 10-second timeout so one slow AI doesn't break everything
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      
      const d = await r.json();
      if (d.error) return `Error: ${d.error.message || d.error}`;
      
      if (type === 'GPT') return d.choices[0].message.content;
      if (type === 'GEMINI') return d.candidates[0].content.parts[0].text;
      if (type === 'GROQ') return d.choices[0].message.content;
    } catch (e) {
      return `${type} Failed: ${e.name === 'AbortError' ? 'Timeout' : e.message}`;
    }
  };

  // 1. GPT-4o-mini (Reliable standard)
  const gpt = getAI('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] })
  }, 'GPT');

  // 2. Gemini 3 Flash (The newest 2026 version)
  const gemini = getAI(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, 'GEMINI');

  // 3. Groq - Llama 3.3 70B Versatile (The current high-performance model)
  const groq = getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }] })
  }, 'GROQ');

  // Use Promise.all to wait for all responses simultaneously
  const [gptRes, geminiRes, groqRes] = await Promise.all([gpt, gemini, groq]);

  res.status(200).json({ gpt: gptRes, gemini: geminiRes, groq: groqRes });
}
