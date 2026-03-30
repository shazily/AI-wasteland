export default async function handler(req, res) {
    const job = req.query.job;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(200).json({ debug: "NO API KEY FOUND" });
    }

    const prompt = `Act as a cynical A.I. Overlord reassigning obsolete humans.
The user's current job is "${job}".
1. Write exactly 4 ULTRA-SHORT savage roasts. Each MAX 3 WORDS, must start with "Meatbag:".
2. Invent ONE darkly funny FUTURE mandatory role (dystopian, doesn't exist yet).
   Title: short & punchy. Description: max 2 sentences of what they will DO.
Return ONLY valid JSON, no markdown:
{"msgs":["m1","m2","m3","m4"],"res":{"t":"Title","d":"Description."}}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
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
        const data = await response.json();
        if (data.error) return res.status(200).json({ debug: data.error.message });
        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(200).json({ debug: err.message });
    }
}
```

5. Tap **Commit changes**

Vercel will auto-deploy within 30 seconds. Then test:
```
https://your-vercel-url.vercel.app/api/get-fate?job=test
