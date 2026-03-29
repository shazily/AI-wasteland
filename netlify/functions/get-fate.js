const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
    const job = event.queryStringParameters.job || "Human";
    
    // These pull from your .env file or Netlify Dashboard
    const apiKey = process.env.GEMINI_API_KEY;
    const githubConfig = {
        username: process.env.GITHUB_USERNAME || "shazily",
        repo: process.env.GITHUB_REPO || "AI-wasteland",
        branch: process.env.GITHUB_BRANCH || "main"
    };

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API Key missing in environment." })
        };
    }

    const systemPrompt = `Act as a clinical, unhinged, and aggressively sarcastic A.I. Overlord. 
    Invent 4 sharp, clever, and high-tier sarcastic loading messages (max 3 words) starting with "Status:". 
    Invent a hilariously absurd dystopian future reassignment role title and a sarcastic 1-sentence description. 
    Return JSON ONLY. Ensure the tone is extremely biting and dismissive of human labor.`;

    const userPrompt = `User current job is: "${job}". Return JSON exactly: {"msgs": ["m1","m2","m3","m4"], "res": {"t": "Role Title", "d": "Description"}}`;

    try {
        // Robust retry logic for the AI Overlord
        let response;
        let retries = 5;
        let backoff = 1000;

        for (let i = 0; i < retries; i++) {
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userPrompt }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: { responseMimeType: "application/json", temperature: 1.0 }
                    })
                }
            );

            if (response.ok) break;
            if (response.status !== 429 && response.status < 500) break;
            await new Promise(r => setTimeout(r, backoff));
            backoff *= 2;
        }

        const data = await response.json();
        const aiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResponseText) throw new Error("Invalid API response");

        const result = {
            ...JSON.parse(aiResponseText),
            github: githubConfig 
        };

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "The Overlord is offline." })
        };
    }
};
