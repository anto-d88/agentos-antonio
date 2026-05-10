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

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return res.status(200).json(data || []);
    }

    if (req.method === "PATCH") {
      const { id, status, completed } = req.body;

      if (!id) {
        return res.status(400).json({
          error: "ID de tâche obligatoire"
        });
      }

      const { data, error } = await supabase
        .from("agent_tasks")
        .update({
          status: status || "done",
          completed: completed ?? true
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        task: data
      });
    }

    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}