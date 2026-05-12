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

    const { data: operationalMemory, error: operationalMemoryError } =
      await supabase
        .from("agent_operational_memory")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);

    if (operationalMemoryError) throw operationalMemoryError;

    const { data: tasks, error: tasksError } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tasksError) throw tasksError;

    const { data: alerts, error: alertsError } = await supabase
      .from("agent_alerts")
      .select("*")
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (alertsError) throw alertsError;

    const { data: planning, error: planningError } = await supabase
      .from("agent_planning")
      .select("*")
      .order("planned_date", { ascending: true })
      .order("planned_time", { ascending: true })
      .limit(200);

    if (planningError) throw planningError;

    const { data: logs, error: logsError } = await supabase
      .from("agent_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsError) throw logsError;

    const today = new Date().toISOString().slice(0, 10);

    const todayConversations = (conversations || []).filter((item) =>
      item.created_at?.startsWith(today)
    );

    const todayPlanning = (planning || []).filter(
      (item) => item.planned_date === today
    );

    const openTasks = (tasks || []).filter(
      (task) => !task.completed && task.status !== "done"
    );

    const unreadAlerts = (alerts || []).filter(
      (alert) => !alert.read && !alert.deleted
    );

    const activeAgents = new Set(
      (conversations || [])
        .map((item) => item.agent)
        .filter(Boolean)
    );

    const urgentAlerts = (alerts || []).filter(
      (alert) =>
        !alert.read &&
        !alert.deleted &&
        String(alert.priority || "").toLowerCase() === "urgent"
    );

    const generatedPlanning = (planning || []).filter(
      (item) => item.generated_by_ai === true
    );

    const stats = {
      conversationsToday: todayConversations.length,
      totalConversations: conversations?.length || 0,
      openTasks: openTasks.length,
      memories: memories?.length || 0,
      operationalMemory: operationalMemory?.length || 0,
      activeAgents: activeAgents.size,
      unreadAlerts: unreadAlerts.length,
      urgentAlerts: urgentAlerts.length,
      planningToday: todayPlanning.length,
      generatedPlanning: generatedPlanning.length,
      logs: logs?.length || 0
    };

    return res.status(200).json({
      success: true,
      stats,
      alerts: alerts || [],
      conversations: conversations || [],
      memories: memories || [],
      operationalMemory: operationalMemory || [],
      tasks: tasks || [],
      planning: planning || [],
      logs: logs || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}