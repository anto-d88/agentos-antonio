import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOrderGroups(orders = []) {
  const deliveredOrders = orders.filter((order) =>
    ["livree", "livre"].includes(normalizeStatus(order.status))
  );

  const preparingOrders = orders.filter((order) =>
    ["en_preparation", "en preparation"].includes(normalizeStatus(order.status))
  );

  const paidOrders = orders.filter((order) =>
    ["payee", "paye"].includes(normalizeStatus(order.status))
  );

  const deliveryOrders = orders.filter((order) =>
    ["en_livraison", "en livraison"].includes(normalizeStatus(order.status))
  );

  const newOrders = orders.filter((order) =>
    ["nouvelle", "new"].includes(normalizeStatus(order.status))
  );

  const canceledOrders = orders.filter((order) =>
    ["annulee", "annule", "cancelled", "canceled"].includes(
      normalizeStatus(order.status)
    )
  );

  const revenueOrders = orders.filter((order) =>
    [
      "payee",
      "paye",
      "en_preparation",
      "en preparation",
      "en_livraison",
      "en livraison",
      "livree",
      "livre"
    ].includes(normalizeStatus(order.status))
  );

  const activeOrders = orders.filter((order) =>
    [
      "nouvelle",
      "new",
      "payee",
      "paye",
      "en_preparation",
      "en preparation",
      "en_livraison",
      "en livraison"
    ].includes(normalizeStatus(order.status))
  );

  return {
    deliveredOrders,
    preparingOrders,
    paidOrders,
    deliveryOrders,
    newOrders,
    canceledOrders,
    revenueOrders,
    activeOrders
  };
}

function getOrderTotal(order) {
  return Number(order.total_amount || order.total_price || 0);
}

function extractJsonArray(text) {
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);

    if (!match) return [];

    try {
      return JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
}

export default async function handler(req, res) {
  try {
    const agentosUrl = process.env.SUPABASE_URL;
    const agentosKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sandwichUrl = process.env.SANDWICH_SUPABASE_URL;
    const sandwichKey = process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY;

    const groqApiKey = process.env.GROQ_API_KEY;

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

    const { data: products, error: productsError } = await sandwich
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productsError) throw productsError;

    const { data: orders, error: ordersError } = await sandwich
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) throw ordersError;

    const {
      deliveredOrders,
      preparingOrders,
      paidOrders,
      deliveryOrders,
      newOrders,
      canceledOrders,
      revenueOrders,
      activeOrders
    } = getOrderGroups(orders || []);

    const lowStock = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 3;
    });

    const revenue = revenueOrders.reduce((sum, order) => {
      return sum + getOrderTotal(order);
    }, 0);

    const lowStockText =
      lowStock
        .map((product) => {
          const stock = Number(product.stock_quantity ?? product.stock ?? 0);
          return `- ${product.name || product.title || "Produit sans nom"} : ${stock}`;
        })
        .join("\n") || "Aucun stock faible.";

    const orderText =
      (orders || [])
        .slice(0, 10)
        .map((order) => {
          return `- Commande ${order.id} | statut réel: ${
            order.status || "non précisé"
          } | total: ${getOrderTotal(order)}€`;
        })
        .join("\n") || "Aucune commande récente.";

    const prompt = `
Tu es le Directeur Opérationnel IA de La Pause Sandwich.

MISSION :
Analyser les données réelles et créer des décisions courtes, exécutables et utiles.

CHIFFRES :
- CA estimé commandes valides : ${revenue.toFixed(2)} €
- Commandes analysées : ${orders?.length || 0}
- Nouvelles : ${newOrders.length}
- Payées : ${paidOrders.length}
- En préparation : ${preparingOrders.length}
- En livraison : ${deliveryOrders.length}
- Livrées : ${deliveredOrders.length}
- Annulées : ${canceledOrders.length}
- Actives à traiter : ${activeOrders.length}
- Produits en stock faible : ${lowStock.length}

STOCK FAIBLE :
${lowStockText}

COMMANDES RÉCENTES :
${orderText}

RÈGLES IMPORTANTES :
- Une commande "livrée" est terminée.
- Ne considère jamais une commande livrée comme en préparation.
- Une décision doit être courte et exécutable.
- Crée seulement les décisions vraiment utiles.
- Si tout est correct, retourne un tableau vide [].

Réponds UNIQUEMENT en JSON valide.

Format obligatoire :
[
  {
    "title": "Action courte",
    "description": "Action concrète à faire",
    "priority": "urgent|high|medium|low",
    "agent_target": "Agent Stock|Agent Commandes|Agent Communication Client|Agent Développement Commercial|Agent Comptabilité|Agent Chef d’entreprise"
  }
]
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "[]";
    const decisions = extractJsonArray(raw);

    const savedDecisions = [];

    for (const decision of decisions) {
      const title = decision.title || "Décision IA";
      const description = decision.description || "Action à vérifier.";
      const priority = decision.priority || "medium";
      const agentTarget = decision.agent_target || "Agent Chef d’entreprise";

      const { data: existingTask } = await agentos
        .from("agent_tasks")
        .select("id")
        .eq("title", title)
        .eq("status", "open")
        .limit(1);

      if (existingTask && existingTask.length > 0) {
        continue;
      }

      const { data: insertedDecision, error: decisionError } = await agentos
        .from("ai_decisions")
        .insert([
          {
            title,
            description,
            priority,
            agent_target: agentTarget,
            status: "pending"
          }
        ])
        .select()
        .single();

      if (decisionError) throw decisionError;

      const { error: taskError } = await agentos.from("agent_tasks").insert([
        {
          from_agent: "Agent Directeur IA",
          to_agent: agentTarget,
          title,
          description,
          priority,
          type: "auto_director",
          status: "open",
          completed: false
        }
      ]);

      if (taskError) throw taskError;

      savedDecisions.push(insertedDecision);
    }

    return res.status(200).json({
      success: true,
      stats: {
        revenue,
        totalOrders: orders?.length || 0,
        newOrders: newOrders.length,
        paidOrders: paidOrders.length,
        preparingOrders: preparingOrders.length,
        deliveryOrders: deliveryOrders.length,
        deliveredOrders: deliveredOrders.length,
        canceledOrders: canceledOrders.length,
        activeOrders: activeOrders.length,
        lowStock: lowStock.length
      },
      raw,
      decisions,
      savedDecisions
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}