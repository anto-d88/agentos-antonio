import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Variables Supabase manquantes dans Vercel"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("agent_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return res.status(500).json({
          error: error.message
        });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("agent_conversations")
        .delete()
        .neq("id", 0);

      if (error) {
        return res.status(500).json({
          error: error.message
        });
      }

      return res.status(200).json({
        success: true
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