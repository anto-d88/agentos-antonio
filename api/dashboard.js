import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Variables Supabase AgentOS manquantes"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: conversations, error: conversationsError } = await supabase
      .from("agent_conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (conversationsError) throw conversationsError;

    const { data: memories, error: memoriesError } = await supabase
      .from("agent_memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (memoriesError) throw memoriesError;

    const { data: tasks, error: tasksError } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tasksError) throw tasksError;

    const { data: alerts, error: alertsError } = await supabase
      .from("agent_alerts")
      .select("*")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (alertsError) throw alertsError;

    const today = new Date().toISOString().slice(0, 10);

    const todayConversations = (conversations || []).filter((item) =>
      item.created_at?.startsWith(today)
    );

    const openTasks = (tasks || []).filter(
      (task) => !task.completed && task.status !== "done"
    );

    const activeAgents = new Set(
      (conversations || []).map((item) => item.agent)
    );

    const stats = {
      conversationsToday: todayConversations.length,
      totalConversations: conversations?.length || 0,
      openTasks: openTasks.length,
      memories: memories?.length || 0,
      activeAgents: activeAgents.size,
      unreadAlerts: alerts?.length || 0
    };

    return res.status(200).json({
      stats,
      alerts: alerts || [],
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