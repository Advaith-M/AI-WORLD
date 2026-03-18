export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { message } = await req.json();

    // This grabs the key you saved in Vercel Settings
    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API Key missing in Vercel." }), { status: 500 });
    }

    // Calling Groq's lightning-fast engine (Llama 3)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", 
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    
    // If Groq has an issue (like a bad key), we tell the HTML to "retry"
    if (!response.ok) {
        return new Response(JSON.stringify({ retry: true }), { status: 200 });
    }

    // Extract the AI's text from the Groq/OpenAI format
    const aiResponse = data.choices[0].message.content;

    // Convert the data into the "Gemini format" so your index.html understands it
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: aiResponse }] } }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // If the server crashes, show the "One Moment..." message on the frontend
    return new Response(JSON.stringify({ retry: true }), { status: 200 });
  }
}

