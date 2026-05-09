const { allowCors, supabase, getConversations } = require("./_core");

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method === "GET") {
    const conversations = await getConversations();
    return res.status(200).json(conversations);
  }

  if (req.method === "DELETE") {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase non configuré" });
    }

    const { error } = await supabase
      .from("agent_conversations")
      .delete()
      .neq("id", 0);

    if (error) {
      return res.status(500).json({ error: "Suppression impossible" });
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Méthode non autorisée" });
};