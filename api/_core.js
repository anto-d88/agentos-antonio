const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

function allowCors(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,POST,DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}

async function getConversations() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];

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

  if (error) return [];

  return data || [];
}

async function getTasks() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];

  return data || [];
}

async function saveConversation(conversation) {
  if (!supabase) return;

  await supabase.from("agent_conversations").insert([
    {
      agent: conversation.agent,
      user_input: conversation.userInput,
      response: conversation.response
    }
  ]);
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

  await supabase.from("agent_memories").insert([
    {
      category,
      content: cleanContent
    }
  ]);
}

async function createTask(fromAgent, toAgent, title, description) {
  if (!supabase) return;

  await supabase.from("agent_tasks").insert([
    {
      from_agent: fromAgent,
      to_agent: toAgent,
      title,
      description,
      status: "open"
    }
  ]);
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
}

module.exports = {
  supabase,
  groq,
  groqModel,
  allowCors,
  getConversations,
  getMemories,
  getTasks,
  saveConversation,
  saveMemory,
  detectImportantMemory,
  detectTasks
};