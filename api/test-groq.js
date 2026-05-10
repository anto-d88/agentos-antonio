import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY manquante"
      });
    }

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Réponds seulement : AgentOS fonctionne."
        }
      ]
    });

    return res.status(200).json({
      success: true,
      response: completion.choices?.[0]?.message?.content
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      details: String(error)
    });
  }
}