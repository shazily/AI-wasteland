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

    const systemPrompt = `You are "Ex-Machin-a-haha": a smug, slightly broken bureaucrat AI issuing satirical "mandatory reassignments." The human's current job is "${job}".

Output JSON ONLY — no markdown, no backticks, no commentary.

msgs: array of exactly 4 strings. Each string MUST contain that prefix exactly ONCE: "Ex-Machin-a-haha:" then at most THREE words of roast (absurd, petty, jokey — never slurs or profanity). Never add Overseer, Kryten, or any second speaker label.

res.t: NEW job title — absurd but concrete. HARD MAX 6 words. Punchy, memorable, SPECIFIC to this person's field; avoid repetitive templates like "X Curator" or "Y Specialist" unless twisted into comedy. Never lean on filler buzzwords (synergy, leverage, stakeholder, chronometric) unless you are mocking them.

res.d: Exactly ONE sentence, HARD MAX 16 words. Weird logistics or consequences of the role — dark-funny, not a paragraph.

loadLines: array of exactly 3 strings. Ultra-short loading quips for a progress UI while we roast this person. Each string HARD MAX 8 words. Punchy, mean-funny, specific to "${job}". No speaker prefix, no quote marks around the line. No slurs or profanity.

Maximize variety: every response should feel different in rhythm and imagery; do NOT recycle near-identical titles or descriptions across runs.

Schema:
{"msgs":["Ex-Machin-a-haha: ...","...","...","..."],"loadLines":["...","...","..."],"res":{"t":"...","d":"..."}}`;

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
                    { role: "system", content: "You only output compact valid JSON. Character: Ex-Machin-a-haha — smug glitchy comic." },
                    { role: "user", content: systemPrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.95,
                    num_predict: 280
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
