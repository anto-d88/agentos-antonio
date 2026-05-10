import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

async function createTask(
  supabase,
  {
    fromAgent,
    toAgent,
    title,
    description,
    priority = "medium",
    type = "general",
    metadata = {}
  }
) {
  const { error } = await supabase.from("agent_tasks").insert([
    {
      from_agent: fromAgent,
      to_agent: toAgent,
      title,
      description,
      priority,
      type,
      completed: false,
      status: "open",
      metadata
    }
  ]);

  if (error) {
    console.error("Erreur création tâche :", error);
  }
}

async function detectTasks(supabase, agentName, userMessage, responseText) {
  const lower = `${userMessage} ${responseText}`.toLowerCase();

  if (
    lower.includes("stock faible") ||
    lower.includes("rupture") ||
    lower.includes("plus assez")
  ) {
    await createTask(supabase, {
      fromAgent: agentName,
      toAgent: "Agent Stock",
      title: "Vérifier stock",
      description: responseText,
      priority: "high",
      type: "stock"
    });
  }

  if (
    lower.includes("client mécontent") ||
    lower.includes("réclamation") ||
    lower.includes("problème client")
  ) {
    await createTask(supabase, {
      fromAgent: agentName,
      toAgent: "Agent Communication Client",
      title: "Gérer problème client",
      description: responseText,
      priority: "high",
      type: "client"
    });
  }

  if (
    lower.includes("prospection") ||
    lower.includes("call center") ||
    lower.includes("entreprise")
  ) {
    await createTask(supabase, {
      fromAgent: agentName,
      toAgent: "Agent Développement Commercial",
      title: "Action commerciale",
      description: responseText,
      priority: "medium",
      type: "commercial"
    });
  }

  if (lower.includes("livraison") && lower.includes("retard")) {
    await createTask(supabase, {
      fromAgent: agentName,
      toAgent: "Agent Commandes",
      title: "Problème livraison",
      description: responseText,
      priority: "urgent",
      type: "delivery"
    });
  }

  if (
    lower.includes("marge") ||
    lower.includes("perte") ||
    lower.includes("dépense")
  ) {
    await createTask(supabase, {
      fromAgent: agentName,
      toAgent: "Agent Comptabilité",
      title: "Analyse financière",
      description: responseText,
      priority: "medium",
      type: "finance"
    });
  }
}

async function saveMemoryIfImportant(supabase, agentName, userMessage) {
  const lower = userMessage.toLowerCase();

  const triggers = [
    "toujours",
    "jamais",
    "important",
    "obligatoire",
    "règle",
    "signature",
    "style",
    "ton",
    "image de marque",
    "à retenir",
    "souviens-toi",
    "note que"
  ];

  const isImportant = triggers.some((word) => lower.includes(word));

  if (!isImportant) return;

  const cleanContent = userMessage.trim();

  const { data: existing } = await supabase
    .from("agent_memories")
    .select("id")
    .eq("content", cleanContent)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("agent_memories").insert([
    {
      category: agentName || "general",
      content: cleanContent
    }
  ]);
}

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
    const groqModel = "llama-3.1-8b-instant";

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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const { agentName, agentPrompt, userMessage } = req.body;

    if (!agentPrompt || !userMessage) {
      return res.status(400).json({
        error: "agentPrompt et userMessage obligatoires"
      });
    }

    const { data: memories } = await supabase
      .from("agent_memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: tasks } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10);

    const memoryText =
      memories?.map((m) => `- ${m.content}`).join("\n") || "Aucune mémoire.";

    const taskText =
      tasks
        ?.map(
          (t) =>
            `- [${t.priority || "medium"}] ${t.title} | ${t.from_agent} → ${t.to_agent}`
        )
        .join("\n") || "Aucune tâche ouverte.";

    const systemPrompt = `
Tu es ${agentName || "un agent IA"} dans AgentOS, le système d'agents IA d'Antonio.

MISSION :
${agentPrompt}

MÉMOIRE :
${memoryText}

TÂCHES OUVERTES :
${taskText}

RÈGLES :
- Réponds toujours en français.
- Sois concret, utile et direct.
- Pas de blabla.
- N'invente jamais de prénom, délai, prix, heure, adresse ou détail non donné.
- Pour les SMS : message prêt à envoyer uniquement.
- Pour les mails : message prêt à envoyer uniquement.
- Ton professionnel, humain et chaleureux.
`;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.4,
      max_tokens: 600,
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
      completion.choices?.[0]?.message?.content?.trim() || "Pas de réponse";

    await supabase.from("agent_conversations").insert([
      {
        agent: agentName || "Agent inconnu",
        user_input: userMessage,
        response: responseText
      }
    ]);

    await saveMemoryIfImportant(supabase, agentName, userMessage);

    await detectTasks(
      supabase,
      agentName || "Agent inconnu",
      userMessage,
      responseText
    );

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