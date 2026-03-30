/**
 * Vercel Serverless Function: get-fate
 * Securely calls Ollama Cloud API to generate dystopian career reassignments.
 */

export default async function handler(req, res) {
    const job = req.query.job || "Human Meatbag";
    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ debug: "NO API KEY FOUND. Please set OLLAMA_API_KEY in Vercel." });
    }

    const systemPrompt = `Act as a cynical, unhinged A.I. Overlord reassigning obsolete humans.
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
                model: "gemma3:4b",
                messages: [{ role: "user", content: systemPrompt }],
                stream: false
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(200).json({ debug: `Ollama API Error: ${response.status}`, details: errText });
        }

        const data = await response.json();
        
        if (!data.message || !data.message.content) {
            return res.status(200).json({ debug: "Ollama returned an empty message.", raw: data });
        }

        let rawContent = data.message.content.trim();

        // AGGRESSIVE JSON EXTRACTION: 
        // This finds the first '{' and the last '}' to strip away markdown backticks or conversational filler.
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            return res.status(200).json({ debug: "No JSON object found in AI response.", raw: rawContent });
        }

        const jsonString = rawContent.substring(firstBrace, lastBrace + 1);

        try {
            const result = JSON.parse(jsonString);
            return res.status(200).json(result);
        } catch (parseError) {
            // Final attempt: Remove common problematic control characters if strict parse fails
            const sanitized = jsonString.replace(/[\x00-\x1F\x7F]/g, "");
            const finalResult = JSON.parse(sanitized);
            return res.status(200).json(finalResult);
        }

    } catch (error) {
        console.error("Serverless Error:", error);
        return res.status(200).json({ 
            debug: "Internal Processing Error", 
            message: error.message 
        });
    }
}
