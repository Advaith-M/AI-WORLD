export default async function handler(req, res) {
  const { prompt, multimodal, image_data } = req.body;
  
  if (!prompt) {
    return res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: "" });
  }

  // 1. ADVANCED REGEX INTENT DETECTION
  const imageRegex = /(?:generate|create|make)\s+(?:me\s+)?(?:a|an)?\s*(?:picture|image|photo|graphic|illustration)\s+(?:of)?/i;
  const isImageGenerationIntent = imageRegex.test(prompt);

  // ROUTE A: IMAGE GENERATION PIPELINE WITH SERVER-SIDE BUFFER CACHING
  if (isImageGenerationIntent) {
    try {
      const match = prompt.match(imageRegex);
      const triggerPhraseIndex = match.index;
      const triggerPhraseLength = match[0].length;
      
      const visualDescription = prompt.substring(triggerPhraseIndex + triggerPhraseLength).trim();
      const finalSubject = visualDescription || "something beautiful";
      const encodedDescription = encodeURIComponent(finalSubject);
      
      const randomSeed = Math.floor(Math.random() * 1000000);
      const targetImageUrl = `https://image.pollinations.ai/p/${encodedDescription}?width=1024&height=1024&nologo=true&model=flux&seed=${randomSeed}`;

      // Fetch the image server-side to bypass potential CORS/CORB blocks
      const imageFetchResponse = await fetch(targetImageUrl);
      
      if (!imageFetchResponse.ok) {
        throw new Error(`Generation node returned status code: ${imageFetchResponse.status}`);
      }

      const arrayBuffer = await imageFetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      const safeDataUri = `data:image/jpeg;base64,${base64Image}`;

      // FIX: Instead of raw HTML, send standard Markdown that any chat UI can render in-line, 
      // or send structured data that your frontend components natively understand.
      const markdownImageOutput = `![Generated Image for: ${finalSubject}](${safeDataUri})`;

      return res.status(200).json({ 
        gpt: "Disabled", 
        gemini: "Disabled", 
        groq: markdownImageOutput,
        isImage: true,          // Flag for frontend ease
        imageUri: safeDataUri,  // Raw URI if you want to bypass markdown parsing entirely
        subject: finalSubject
      });

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

  res.status(200).json({ gpt: "Disabled", gemini: "Disabled", groq: groqRes, isImage: false });
}
