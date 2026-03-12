// This script runs on the server side (Vercel), keeping your key hidden from bots.
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { message } = await req.json();
    
    // This pulls the key from your Vercel Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY; 

    // We use the 2026 Gemini 3.1 Flash-Lite model you requested
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }]
      })
    });

    const data = await response.json();

    // Send the AI's answer back to your index.html
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Connection to AI failed." }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}