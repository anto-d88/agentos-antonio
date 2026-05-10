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

    const { data, error } = await supabase
      .from("agent_memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}