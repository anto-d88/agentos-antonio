import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Variables Supabase manquantes"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: conversations } = await supabase
      .from("agent_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: memories } = await supabase
      .from("agent_memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: tasks } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const today = new Date().toISOString().slice(0, 10);

    const todayConversations = (conversations || []).filter((item) =>
      item.created_at?.startsWith(today)
    );

    const openTasks = (tasks || []).filter(
      (task) => task.status === "open"
    );

    const activeAgents = new Set(
      (conversations || []).map((item) => item.agent)
    );

    const alerts = [];

    if (openTasks.length > 0) {
      alerts.push({
        type: "task",
        title: `${openTasks.length} tâche(s) ouverte(s)`,
        message: "Des actions attendent une décision ou un suivi."
      });
    }

    if (todayConversations.length === 0) {
      alerts.push({
        type: "activity",
        title: "Aucune activité aujourd’hui",
        message: "Aucun agent n’a encore été utilisé aujourd’hui."
      });
    }

    const stats = {
      conversationsToday: todayConversations.length,
      totalConversations: conversations?.length || 0,
      openTasks: openTasks.length,
      memories: memories?.length || 0,
      activeAgents: activeAgents.size
    };

    return res.status(200).json({
      stats,
      alerts,
      conversations: conversations || [],
      memories: memories || [],
      tasks: tasks || []
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}