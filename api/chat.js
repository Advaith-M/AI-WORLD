export default async function handler(req, res) {
  // Destructure incoming prompt, along with the custom multimodal flags sent by your frontend
  const { prompt, multimodal, image_data } = req.body;

  const getAI = async (url, options, type) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (data.error) {
        return `Error from ${type}: ${data.error.message || JSON.stringify(data.error)}`;
      }
      
      if (type === 'GROQ') return data.choices[0].message.content;
    } catch (e) {
      return `${type} Failed: ${e.message}`;
    }
  };

  // 1. OpenAI (Bypassed)
  const gptRes = "OpenAI is currently disabled.";

  // 2. Gemini (Bypassed)
  const geminiRes = "Gemini is currently disabled.";

  // 3. GROQ - Fully active with dynamic support for text prompts and vision text integration
  let groqBody;

  if (multimodal && image_data) {
    // If the frontend passes a captured camera frame, we package it into the system context 
    // along with the user text so Groq reads everything together.
    groqBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this image asset context completely and explicitly address this user prompt: ${prompt}` },
            { type: "image_url", image_url: { url: image_data } }
          ]
        }
      ]
    };
  } else {
    // Standard text-only fallback payload
    groqBody = {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }]
    };
  }

  const groqRes = await getAI('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(groqBody)
  }, 'GROQ');

  // Return the structure cleanly so your frontend layout mapping code doesn't crash
  res.status(200).json({ gpt: gptRes, gemini: geminiRes, groq: groqRes });
}
