export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { message } = await req.json();

    // 1. Map all 4 keys from Vercel Environment Variables
    const keys = {
      groq: process.env.GROQ_API_KEY,
      or: process.env.OPENROUTER_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY
    };

    // 2. Launch all 4 AI requests simultaneously (The Council)
    const results = await Promise.all([
      // GROQ
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${keys.groq}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "user", content: message }] })
      }).then(r => r.json()).then(d => d.choices[0].message.content).catch(() => "Groq Offline"),

      // OPENROUTER
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${keys.or}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openrouter/auto", messages: [{ role: "user", content: message }] })
      }).then(r => r.json()).then(d => d.choices[0].message.content).catch(() => "OpenRouter Offline"),

      // GEMINI
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
      }).then(r => r.json()).then(d => d.candidates[0].content.parts[0].text).catch(() => "Gemini Offline"),

      // GPT (OpenAI)
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { "Authorization": `Bearer ${keys.openai}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: message }] })
      }).then(r => r.json()).then(d => d.choices[0].message.content).catch(() => "GPT Offline")
    ]);

    // 3. Construct the combined response
    const finalDisplay = `🤖 GROQ: ${results[0]}\n\n🌐 OPENROUTER: ${results[1]}\n\n✨ GEMINI: ${results[2]}\n\n🧠 GPT: ${results[3]}`;

    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: finalDisplay }] } }]
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: "One or more API keys are missing or invalid in Vercel settings." }), { status: 500 });
  }
}
