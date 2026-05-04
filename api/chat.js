export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (data.error) {
        return `Error from ${type}: ${data.error.message || JSON.stringify(data.error)}`;
      }
      
      if (type === 'GPT') return data.choices[0].message.content;
      if (type === 'GEMINI') return data.candidates[0].content.parts[0].text;
      if (type === 'GROQ') return data.choices[0].message.content;
    } catch (e) {
      return `${type} Failed: ${e.message}`;
    }
  };

  // 1. OpenAI (Still requires >$0 balance)
  const gpt = getAI('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] })
  }, 'GPT');

  // 2. GEMINI - Use v1beta and the specific preview string for 3.1 Pro
  const gemini = getAI(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, 'GEMINI');

  // 3. GROQ - Using the newest Llama 3.3 70B model
  const groq = getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }] })
  }, 'GROQ');

  const [gptRes, geminiRes, groqRes] = await Promise.all([gpt, gemini, groq]);
  res.status(200).json({ gpt: gptRes, gemini: geminiRes, groq: groqRes });
}
