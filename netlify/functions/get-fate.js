exports.handler = async function(event) {
    const job = event.queryStringParameters.job;
    const apiKey = process.env.GEMINI_API_KEY; // reads from Netlify, never exposed

    const prompt = `Act as a cynical A.I. Overlord reassigning obsolete humans.
The user's current job is "${job}".
1. Write exactly 4 ULTRA-SHORT savage roasts. Each MAX 3 WORDS, must start with "Meatbag:".
2. Invent ONE darkly funny FUTURE mandatory role (dystopian, doesn't exist yet).
   Title: short & punchy. Description: max 2 sentences of what they will DO.
Return ONLY valid JSON, no markdown:
{"msgs":["m1","m2","m3","m4"],"res":{"t":"Title","d":"Description."}}`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 1.2,
                        maxOutputTokens: 350
                    }
                })
            }
        );
        const data = await res.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    } catch (err) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                msgs: ["Meatbag: Future cancelled.", "Meatbag: Skill issue.", "Meatbag: Ego rebooting.", "Meatbag: System upgrade."],
                res: { t: "Analog Server Fan Technician", d: "You will stand in the CPU hall and blow through a straw for 12 hours daily. Overtime is mandatory." }
            })
        };
    }
};
