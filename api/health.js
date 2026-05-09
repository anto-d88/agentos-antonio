const { allowCors, supabase, groq } = require("./_core");

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;

  res.status(200).json({
    ok: true,
    message: "AgentOS API Vercel opérationnelle",
    database: supabase ? "supabase" : "not_configured",
    ai: groq ? "groq" : "not_configured"
  });
};