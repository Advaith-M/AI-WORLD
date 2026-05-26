export default async function handler(req, res) {
  const { prompt, multimodal, image_data } = req.body;
  
  if (!prompt) {
    return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: "" });
  }

  // 1. ADVANCED REGEX INTENT DETECTION (Fixes matching issues completely)
  // This matches "generate", "create", or "make" followed by "picture", "image", or "photo" anywhere in the string
  const imageRegex = /(?:generate|create|make)\s+(?:me\s+)?(?:a|an)?\s*(?:picture|image|photo|graphic|illustration)\s+(?:of)?/i;
  const isImageGenerationIntent = imageRegex.test(prompt);

  // ROUTE A: FREE IMAGE GENERATION PIPELINE
  if (isImageGenerationIntent) {
    try {
      // Isolate the subject description by stripping out the detected trigger phrase and everything before it
      const match = prompt.match(imageRegex);
      const triggerPhraseIndex = match.index;
      const triggerPhraseLength = match[0].length;
      
      // Captures everything after the trigger words (the actual subject of the image)
      const visualDescription = prompt.substring(triggerPhraseIndex + triggerPhraseLength).trim();

      // Fallback description if extraction leaves an empty string
      const finalSubject = visualDescription || "something beautiful";

      // Encode the text string securely into URL format
      const encodedDescription = encodeURIComponent(finalSubject);
      
      // Instant execution using the ultra-reliable, free high-speed production engine
      const generatedImageUrl = `https://image.pollinations.ai/p/${encodedDescription}?width=1024&height=1024&nologo=true`;

      // Structure the precise layout payload mapping perfectly into your frontend's innerHTML render thread
      const embeddedHtmlOutput = `
        <div class="generated-image-container" style="width: 100%;">
          <p style="margin-bottom: 10px; color: rgba(255,255,255,0.6); font-size: 13px;">
            <i class="fas fa-magic"></i> Generated Image for: <i>"${finalSubject}"</i>
          </p>
          <img src="${generatedImageUrl}" class="chat-img-preview" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.2);" alt="AI Output">
        </div>
      `;

      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: embeddedHtmlOutput });

    } catch (err) {
      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: `Pipeline Failure: ${err.message}` });
    }
  }

  // ROUTE B: STANDARD TEXT & VISION GROQ PIPELINE (Fires if regex pattern fails)
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
