export default async function handler(req, res) {
  const { prompt, multimodal, image_data } = req.body;
  
  if (!prompt) {
    return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: "" });
  }

  const lowerPrompt = prompt.toLowerCase().trim();

  // 1. INTENT DETECTION MATCHING PATTERNS
  const isImageGenerationIntent = 
    (lowerPrompt.startsWith("generate me a picture of") || 
     lowerPrompt.startsWith("create me a picture of") ||
     lowerPrompt.startsWith("generate a picture of") ||
     lowerPrompt.startsWith("create a picture of") ||
     lowerPrompt.startsWith("generate an image of") ||
     lowerPrompt.startsWith("create an image of"));

  // ROUTE A: IMAGE GENERATION PIPELINE
  if (isImageGenerationIntent) {
    try {
      // Isolate the visual subject description by stripping out the trigger phrase
      const visualDescription = prompt.replace(/(generate|create)\s+(me\s+)?a\s+(picture|image)\s+of\s+/i, "").trim();

      // FIXED: Routed to the official /v1/images/generations endpoint using the active gpt-image-1.5 flagship model
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-image-1.5", 
          prompt: visualDescription,
          n: 1,
          size: "1024x1024"
        })
      });

      const imageData = await imageResponse.json();

      if (imageData.error) {
        return res.status(200).json({ 
          gpt: "Disabled", 
          gemini: "Disabled", 
          groq: `Image Generation Error: ${imageData.error.message || JSON.stringify(imageData.error)}` 
        });
      }

      const generatedImageUrl = imageData.data[0].url;

      // Construct a pristine HTML payload to match the frontend's innerHTML parsing rule
      const embeddedHtmlOutput = `
        <div class="generated-image-container" style="width: 100%;">
          <p style="margin-bottom: 10px; color: rgba(255,255,255,0.6); font-size: 13px;">
            <i class="fas fa-magic"></i> Generated Image for: <i>"${visualDescription}"</i>
          </p>
          <img src="${generatedImageUrl}" class="chat-img-preview" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.2);">
        </div>
      `;

      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: embeddedHtmlOutput });

    } catch (err) {
      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: `Pipeline Failure: ${err.message}` });
    }
  }

  // ROUTE B: STANDARD TEXT & VISION GROQ PIPELINE
  const getAI = async (url, options, type) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (data.error) return `Error from ${type}: ${data.error.message || JSON.stringify(data.error)}`;
      if (type === 'GROQ') return data.choices[0].message.content;
    } catch (e) {
      return `${type} Failed: ${e.message}`;
    }
  };

  let groqBody;
  if (multimodal && image_data) {
    groqBody = {
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Analyze this image asset context completely and explicitly address this user prompt: ${prompt}` },
          { type: "image_url", image_url: { url: image_data } }
        ]
      }]
    };
  } else {
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

  res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: groqRes });
}
