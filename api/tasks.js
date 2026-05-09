import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erreur tasks"
    });
  }
}