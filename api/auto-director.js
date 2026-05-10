import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const agentos = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sandwich = createClient(
      process.env.SANDWICH_SUPABASE_URL,
      process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY
    );

    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const { data: products } = await sandwich
      .from("products")
      .select("*");

    const { data: orders } = await sandwich
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const lowStock = (products || []).filter((p) => {
      const stock = Number(p.stock_quantity ?? p.stock ?? 0);
      return stock <= 3;
    });

    const revenue = (orders || []).reduce((sum, order) => {
      return (
        sum +
        Number(order.total_amount || order.total_price || 0)
      );
    }, 0);

    const prompt = `
Tu es le Directeur Opérationnel IA de La Pause Sandwich.

MISSION :
Analyser les données et prendre des décisions concrètes.

DONNÉES :

CA estimé :
${revenue.toFixed(2)} €

Stock faible :
${lowStock
  .map(
    (p) =>
      `- ${p.name || p.title} : ${
        p.stock_quantity ?? p.stock ?? 0
      }`
  )
  .join("\n")}

Commandes :
${orders?.length || 0}

Tu dois :
- identifier les priorités,
- détecter les problèmes,
- proposer des actions concrètes,
- décider quels agents doivent agir.

Réponds UNIQUEMENT en JSON valide.

Format :

[
  {
    "title": "...",
    "description": "...",
    "priority": "urgent|high|medium|low",
    "agent_target": "Agent Stock"
  }
]
`;

    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

    const raw =
      completion.choices?.[0]?.message?.content || "[]";

    let decisions = [];

    try {
      decisions = JSON.parse(raw);
    } catch {
      decisions = [];
    }

    for (const decision of decisions) {
      await agentos.from("ai_decisions").insert([
        {
          title: decision.title,
          description: decision.description,
          priority: decision.priority,
          agent_target: decision.agent_target
        }
      ]);

      await agentos.from("agent_tasks").insert([
        {
          from_agent: "Agent Directeur IA",
          to_agent: decision.agent_target,
          title: decision.title,
          description: decision.description,
          priority: decision.priority,
          type: "auto_director",
          status: "open",
          completed: false
        }
      ]);
    }

    return res.status(200).json({
      success: true,
      decisions
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}