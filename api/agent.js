import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Méthode non autorisée"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel =
      process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase non configuré"
      });
    }

    if (!groqApiKey) {
      return res.status(500).json({
        error: "Groq non configuré"
      });
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const {
      agentName,
      agentPrompt,
      userMessage
    } = req.body;

    if (!agentPrompt || !userMessage) {
      return res.status(400).json({
        error:
          "agentPrompt et userMessage obligatoires"
      });
    }

    const { data: memories } = await supabase
      .from("agent_memories")
      .select("*")
      .limit(20);

    const memoryText =
      memories?.map((m) => `- ${m.content}`).join("\n") ||
      "";

    const systemPrompt = `
Tu es ${agentName || "un agent IA"}.

MISSION :
${agentPrompt}

MÉMOIRE :
${memoryText}

RÈGLES :
- Réponds toujours en français
- Sois concret
- Pas de blabla
- Pour les SMS : message prêt à envoyer
- Ton professionnel et humain
`;

    const completion =
      await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      });

    const responseText =
      completion.choices?.[0]?.message?.content ||
      "Pas de réponse";

    await supabase
      .from("agent_conversations")
      .insert([
        {
          agent: agentName,
          user_input: userMessage,
          response: responseText
        }
      ]);

    return res.status(200).json({
      response: responseText
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
      details: String(error)
    });
  }
}