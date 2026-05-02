export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Helper to call OpenAI
    const fetchOpenAI = async () => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "OpenAI was unable to respond.";
    };

    // Helper to call Gemini
    const fetchGemini = async () => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini was unable to respond.";
    };

    // Helper to call Groq
    const fetchGroq = async () => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Groq was unable to respond.";
    };

    try {
        // Execute all 3 requests at the same time for maximum speed
        const [gpt, gemini, groq] = await Promise.all([
            fetchOpenAI().catch(e => `OpenAI Error: ${e.message}`),
            fetchGemini().catch(e => `Gemini Error: ${e.message}`),
            fetchGroq().catch(e => `Groq Error: ${e.message}`)
        ]);

        // Return the combined object to the frontend
        res.status(200).json({ gpt, gemini, groq });
    } catch (error) {
        res.status(500).json({ error: "The AI Council failed to deliberate." });
    }
}
