import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("agent_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return res.status(200).json(data || []);
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("agent_conversations")
        .delete()
        .neq("id", 0);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erreur conversations"
    });
  }
}