module.exports = async function(req, res) {
    const key = process.env.OLLAMA_API_KEY || "MISSING";
    res.end(JSON.stringify({ key: key.slice(0, 6) }));
}
