/**
 * Vercel Serverless Function: get-fate
 * Securely calls Ollama Cloud API to generate dystopian career reassignments.
 */

export default async function handler(req, res) {
    const job = req.query.job || "Curious Human";
    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ debug: "NO API KEY FOUND. Please set OLLAMA_API_KEY in Vercel." });
    }

    // Optimization: Keeping the prompt extremely concise to speed up Ollama's generation time
    const systemPrompt = `Act as a cynical, unhinged A.I. Overlord reassigning humans.
    Current job: "${job}".
    Task: 
    1. Write 4 playful roasts (MAX 3 WORDS each after the prefix, each line starts with "Kryten:" — deadpan service-droid snark, Red Dwarf energy — jokey, not slurs or profanity).
    2. Invent ONE dystopian FUTURE mandatory role (short Title and 1-sentence Description).
    
    Format as JSON ONLY:
    {"msgs":["m1","m2","m3","m4"],"res":{"t":"Title","d":"Description"}}`;

    try {
        const response = await fetch("https://ollama.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gemma3:4b",
                messages: [
                    { role: "system", content: "You are a sarcastic AI that only outputs JSON." },
                    { role: "user", content: systemPrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.9,
                    num_predict: 150 // Limit output length to ensure we beat the 10s timeout
                }
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
            // Clean up common AI formatting quirks before parsing
            const sanitized = jsonString.replace(/[\x00-\x1F\x7F]/g, ""); 
            const result = JSON.parse(sanitized);

            // Ensure the structure is correct before sending to frontend
            if (!result.msgs || !Array.isArray(result.msgs) || !result.res) {
                 throw new Error("Invalid JSON structure");
            }

            return res.status(200).json(result);
        } catch (parseError) {
            return res.status(200).json({ 
                debug: "JSON Parse Failed", 
                raw: rawContent,
                error: parseError.message 
            });
        }

    } catch (error) {
        console.error("Serverless Error:", error);
        return res.status(200).json({ 
            debug: "Internal Processing Error", 
            message: error.message 
        });
    }
}
