module.exports = async function handler(req, res) {
    const apiKey = process.env.OLLAMA_API_KEY;
    return res.status(200).json({ 
        keyFound: !!apiKey, 
        keyPreview: apiKey ? apiKey.substring(0, 8) + "..." : "MISSING",
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('OLLAMA'))
    });
}
    const prompt = `Act as a cynical A.I. Overlord reassigning obsolete humans.
The user's current job is "${job}".
1. Write exactly 4 ULTRA-SHORT savage roasts. Each MAX 3 WORDS, must start with "Meatbag:".
2. Invent ONE darkly funny FUTURE mandatory role (dystopian, doesn't exist yet).
   Title: short & punchy. Description: max 2 sentences of what they will DO.
Return ONLY valid JSON, no markdown, no extra text:
{"msgs":["m1","m2","m3","m4"],"res":{"t":"Title","d":"Description."}}`;

    try {
        const response = await fetch("https://ollama.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama3.2",
                messages: [{ role: "user", content: prompt }],
                stream: false
            })
        });

        const data = await response.json();
        if (!data.message) return res.status(200).json({ debug: JSON.stringify(data) });

        const text = data.message.content.trim();
        const result = JSON.parse(text);
        return res.status(200).json(result);

    } catch (err) {
        return res.status(200).json({ debug: err.message });
    }
}
