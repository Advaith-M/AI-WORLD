export default async function handler(req, res) {
  const { prompt, multimodal, image_data } = req.body;
  
  if (!prompt) {
    return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: "" });
  }

  // 1. ADVANCED REGEX INTENT DETECTION
  const imageRegex = /(?:generate|create|make)\s+(?:me\s+)?(?:a|an)?\s*(?:picture|image|photo|graphic|illustration)\s+(?:of)?/i;
  const isImageGenerationIntent = imageRegex.test(prompt);

  // ROUTE A: IMAGE GENERATION PIPELINE WITH SERVER-SIDE BUFFER CACHING (Bypasses CORB)
  if (isImageGenerationIntent) {
    try {
      // Isolate the subject description by stripping out the detected trigger phrase
      const match = prompt.match(imageRegex);
      const triggerPhraseIndex = match.index;
      const triggerPhraseLength = match[0].length;
      
      const visualDescription = prompt.substring(triggerPhraseIndex + triggerPhraseLength).trim();
      const finalSubject = visualDescription || "something beautiful";
      const encodedDescription = encodeURIComponent(finalSubject);
      
      // OPTIMIZATION: Enforcing Flux model, crisp dimensions, and cache-busting seed for infinite unique generations
      const randomSeed = Math.floor(Math.random() * 1000000);
      const targetImageUrl = `https://image.pollinations.ai/p/${encodedDescription}?width=1024&height=1024&nologo=true&model=flux&seed=${randomSeed}`;

      // CRITICAL CORB BYPASS: Fetch the image on the server where CORB security limits don't apply
      const imageFetchResponse = await fetch(targetImageUrl);
      
      if (!imageFetchResponse.ok) {
        throw new Error(`Generation node returned status code: ${imageFetchResponse.status}`);
      }

      // Convert the raw binary data stream into a node buffer array
      const arrayBuffer = await imageFetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Convert buffer stream directly into a safe, localized base64 string
      const base64Image = buffer.toString('base64');
      const safeDataUri = `data:image/jpeg;base64,${base64Image}`;

      // Package self-contained data URI inside HTML frame string
      const embeddedHtmlOutput = `
        <div class="generated-image-container" style="width: 100%;">
          <p style="margin-bottom: 10px; color: rgba(255,255,255,0.6); font-size: 13px;">
            <i class="fas fa-magic"></i> Generated Image for: <i>"${finalSubject}"</i>
          </p>
          <img src="${safeDataUri}" class="chat-img-preview" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.2);" alt="AI Output">
        </div>
      `;

      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: embeddedHtmlOutput });

    } catch (err) {
      return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: `Pipeline Failure (CORB Bypass Stack): ${err.message}` });
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
    // OPTIMIZATION: Switched to Groq's dedicated vision model to prevent API structural crashes
    groqBody = {
      model: "llama-3.2-11b-vision-preview",
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
