export default async function handler(req, res) {
  const { prompt } = req.body;
  
  // Helper to prevent one slow AI from breaking the whole site
  const getAIResponse = async (apiCall) => {
    try { return await apiCall(); } 
    catch (e) { return "Service currently unavailable."; }
  };

  const gpt = await getAIResponse(async () => {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    return d.choices[0].message.content;
  });

  // ... (Repeat logic for Gemini and Groq)

  res.status(200).json({ gpt, gemini: "Response Pending", groq: "Response Pending" });
}
