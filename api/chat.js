export default async function handler(req, res) {
  const { prompt } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const r = await fetch(url, options);
      const d = await r.json();
      
      // If the AI company sends an error (like "Invalid Key"), show it
      if (d.error) return `Error from ${type}: ${d.error.message || d.error}`;
      
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

  // ... (Add your Gemini and Groq fetch logic here following the same pattern)

  res.status(200).json({ gpt, gemini: "Pending", groq: "Pending" });
}