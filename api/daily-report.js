import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const agentosUrl = process.env.SUPABASE_URL;
    const agentosKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sandwichUrl = process.env.SANDWICH_SUPABASE_URL;
    const sandwichKey = process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY;

    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = "llama-3.1-8b-instant";

    if (!agentosUrl || !agentosKey) {
      return res.status(500).json({
        error: "Supabase AgentOS non configuré"
      });
    }

    if (!sandwichUrl || !sandwichKey) {
      return res.status(500).json({
        error: "Supabase La Pause Sandwich non configuré"
      });
    }

    if (!groqApiKey) {
      return res.status(500).json({
        error: "Groq non configuré"
      });
    }

    const agentos = createClient(agentosUrl, agentosKey);
    const sandwich = createClient(sandwichUrl, sandwichKey);

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: orders, error: ordersError } = await sandwich
      .from("orders")
      .select("*")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    const { data: products, error: productsError } = await sandwich
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productsError) throw productsError;

    const { data: tasks, error: tasksError } = await agentos
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tasksError) throw tasksError;

    const paidStatuses = ["payée", "payee", "livrée", "livree", "en_preparation"];

    const paidOrders = (orders || []).filter((order) =>
      paidStatuses.includes(String(order.status || "").toLowerCase())
    );

    const revenue = paidOrders.reduce((sum, order) => {
      return sum + Number(order.total_amount || order.total_price || 0);
    }, 0);

    const lowStock = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 3;
    });

    const openTasks = (tasks || []).filter(
      (task) => !task.completed && task.status !== "done"
    );

    const productsText =
      (products || [])
        .map((product) => {
          const stock = Number(product.stock_quantity ?? product.stock ?? 0);
          const price = Number(product.price || product.unit_price || 0);

          return `- ${product.name || product.title || "Produit sans nom"} | stock: ${stock} | prix: ${price}€`;
        })
        .join("\n") || "Aucun produit.";

    const ordersText =
      (orders || [])
        .slice(0, 20)
        .map((order) => {
          return `- Commande ${order.id} | statut: ${order.status || "non précisé"} | total: ${
            order.total_amount || order.total_price || 0
          }€ | date: ${order.created_at}`;
        })
        .join("\n") || "Aucune commande aujourd’hui.";

    const tasksText =
      openTasks
        .slice(0, 20)
        .map((task) => {
          return `- [${task.priority || "medium"}] ${task.title} | ${task.from_agent} → ${task.to_agent}`;
        })
        .join("\n") || "Aucune tâche ouverte.";

    const prompt = `
Tu es l'Agent Direction d'Antonio pour La Pause Sandwich.

Données du jour :

COMMANDES AUJOURD'HUI :
${ordersText}

PRODUITS / STOCK :
${productsText}

TÂCHES OUVERTES :
${tasksText}

CHIFFRES :
- Commandes totales aujourd'hui : ${orders?.length || 0}
- Commandes payées/livrées/en préparation : ${paidOrders.length}
- Chiffre d'affaires estimé du jour : ${revenue.toFixed(2)} €
- Produits en stock faible : ${lowStock.length}

Ta mission :
Fais un rapport clair et utile avec :
1. Résumé de la journée
2. Chiffre d'affaires
3. Commandes
4. Stock faible
5. Problèmes à surveiller
6. Priorités pour demain

Réponds en français, de façon directe et actionnable.
`;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const report =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Rapport impossible à générer.";

    return res.status(200).json({
      success: true,
      stats: {
        ordersToday: orders?.length || 0,
        paidOrders: paidOrders.length,
        revenue,
        lowStock: lowStock.length,
        openTasks: openTasks.length
      },
      report
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}