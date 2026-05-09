require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase non configuré.");
}

if (!groqApiKey) {
  console.warn("Groq non configuré.");
}

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const groq =
  groqApiKey
    ? new OpenAI({
        apiKey: groqApiKey,
        baseURL: "https://api.groq.com/openai/v1"
      })
    : null;

async function getConversations() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erreur conversations :", error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    agent: item.agent,
    userInput: item.user_input,
    response: item.response,
    date: new Date(item.created_at).toLocaleString("fr-FR")
  }));
}

async function getMemories() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_memories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Erreur mémoires :", error);
    return [];
  }

  return data || [];
}

async function getTasks() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erreur tâches :", error);
    return [];
  }

  return data || [];
}

async function saveConversation(conversation) {
  if (!supabase) return;

  const { error } = await supabase.from("agent_conversations").insert([
    {
      agent: conversation.agent,
      user_input: conversation.userInput,
      response: conversation.response
    }
  ]);

  if (error) {
    console.error("Erreur sauvegarde conversation :", error);
  }
}

async function saveMemory(content, category = "general") {
  if (!supabase || !content) return;

  const cleanContent = content.trim();

  const { data: existing } = await supabase
    .from("agent_memories")
    .select("id")
    .eq("content", cleanContent)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("agent_memories").insert([
    {
      category,
      content: cleanContent
    }
  ]);

  if (error) {
    console.error("Erreur sauvegarde mémoire :", error);
  }
}

async function createTask(fromAgent, toAgent, title, description) {
  if (!supabase) return;

  const { error } = await supabase.from("agent_tasks").insert([
    {
      from_agent: fromAgent,
      to_agent: toAgent,
      title,
      description,
      status: "open"
    }
  ]);

  if (error) {
    console.error("Erreur création tâche :", error);
  }
}

function detectImportantMemory(message) {
  const lower = message.toLowerCase();

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

  return triggers.some((word) => lower.includes(word));
}

async function detectTasks(agentName, userMessage, responseText) {
  const lower = `${userMessage} ${responseText}`.toLowerCase();

  if (
    lower.includes("rupture") ||
    lower.includes("stock faible") ||
    lower.includes("plus assez")
  ) {
    await createTask(
      agentName,
      "Agent Chef d’entreprise",
      "Vérifier le stock",
      responseText
    );
  }

  if (
    lower.includes("client mécontent") ||
    lower.includes("réclamation") ||
    lower.includes("problème client")
  ) {
    await createTask(
      agentName,
      "Agent Communication Client",
      "Gérer un problème client",
      responseText
    );
  }

  if (
    lower.includes("prospection") ||
    lower.includes("call center") ||
    lower.includes("entreprise")
  ) {
    await createTask(
      agentName,
      "Agent Développement Commercial",
      "Action commerciale à suivre",
      responseText
    );
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "AgentOS API",
    ai: groq ? "groq" : "not_configured",
    database: supabase ? "supabase" : "not_configured"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "AgentOS API opérationnelle"
  });
});

app.get("/api/conversations", async (req, res) => {
  const conversations = await getConversations();
  res.json(conversations);
});

app.get("/api/memories", async (req, res) => {
  const memories = await getMemories();
  res.json(memories);
});

app.get("/api/tasks", async (req, res) => {
  const tasks = await getTasks();
  res.json(tasks);
});

app.delete("/api/conversations", async (req, res) => {
  if (!supabase) return res.json({ success: false });

  const { error } = await supabase
    .from("agent_conversations")
    .delete()
    .neq("id", 0);

  if (error) {
    return res.status(500).json({ error: "Suppression impossible" });
  }

  res.json({ success: true });
});

app.post("/api/agent", async (req, res) => {
  try {
    const { agentName, agentPrompt, userMessage } = req.body;

    if (!groq) {
      return res.status(500).json({
        error: "Groq n’est pas configuré. Vérifie GROQ_API_KEY."
      });
    }

    if (!agentPrompt || !userMessage) {
      return res.status(400).json({
        error: "agentPrompt et userMessage sont obligatoires."
      });
    }

    const memories = await getMemories();
    const conversations = await getConversations();
    const tasks = await getTasks();

    const memoryText =
      memories.map((m) => `- ${m.content}`).join("\n") ||
      "Aucune mémoire longue durée.";

    const recentText =
      conversations
        .slice(0, 5)
        .map(
          (c) =>
            `Agent: ${c.agent}\nDemande: ${c.userInput}\nRéponse: ${c.response}`
        )
        .join("\n\n---\n\n") || "Aucun contexte récent.";

    const taskText =
      tasks
        .slice(0, 10)
        .map(
          (t) =>
            `- [${t.status}] ${t.title} | de ${t.from_agent} vers ${t.to_agent}`
        )
        .join("\n") || "Aucune tâche en cours.";

    const systemPrompt = `
Tu es ${agentName || "un agent IA"} dans AgentOS, le système d'agents IA d'Antonio.

MISSION DE CET AGENT :
${agentPrompt}

MÉMOIRE LONG TERME :
${memoryText}

CONTEXTE RÉCENT :
${recentText}

TÂCHES ACTUELLES :
${taskText}

RÈGLES ABSOLUES :
- Réponds toujours en français.
- Réponds clairement, utilement et concrètement.
- Pas de blabla.
- N'invente jamais un prénom, une heure, un délai, un prix, une adresse ou un détail non donné.
- Si la demande concerne un SMS ou un mail, donne un message prêt à envoyer.
- Pour La Pause Sandwich, garde un ton professionnel, humain, simple et chaleureux.
`;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.4,
      max_tokens: 900,
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
      completion.choices?.[0]?.message?.content?.trim() ||
      "L’agent n’a pas répondu.";

    const conversation = {
      agent: agentName || "Agent inconnu",
      userInput: userMessage,
      response: responseText
    };

    await saveConversation(conversation);

    if (detectImportantMemory(userMessage)) {
      await saveMemory(userMessage, agentName || "general");
    }

    await detectTasks(agentName || "Agent inconnu", userMessage, responseText);

    res.json({
      response: responseText
    });
  } catch (error) {
    console.error("Erreur /api/agent :", error);

    res.status(500).json({
      error: "Erreur IA côté serveur."
    });
  }
});

app.listen(PORT, () => {
  console.log(`AgentOS API lancée sur le port ${PORT}`);
});