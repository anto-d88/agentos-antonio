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

    const revenue = revenueOrders.reduce((sum, order) => {
      return sum + getOrderTotal(order);
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
          return `- Commande ${order.id} | statut réel: ${
            order.status || "non précisé"
          } | total: ${getOrderTotal(order)}€ | date: ${order.created_at}`;
        })
        .join("\n") || "Aucune commande aujourd’hui.";

    const tasksText =
      openTasks
        .slice(0, 20)
        .map((task) => {
          return `- [${task.priority || "medium"}] ${task.title} | ${
            task.from_agent
          } → ${task.to_agent}`;
        })
        .join("\n") || "Aucune tâche ouverte.";

    const lowStockText =
      lowStock
        .map((product) => {
          const stock = Number(product.stock_quantity ?? product.stock ?? 0);
          return `- ${product.name || product.title || "Produit sans nom"} : ${stock}`;
        })
        .join("\n") || "Aucun stock faible.";

    const prompt = `
Tu es l'Agent Direction d'Antonio pour La Pause Sandwich.

Données du jour :

COMMANDES AUJOURD'HUI :
${ordersText}

RÉPARTITION DES STATUTS :
- Nouvelles : ${newOrders.length}
- Payées : ${paidOrders.length}
- En préparation : ${preparingOrders.length}
- En livraison : ${deliveryOrders.length}
- Livrées : ${deliveredOrders.length}
- Annulées : ${canceledOrders.length}
- Actives à traiter : ${activeOrders.length}

PRODUITS / STOCK :
${productsText}

STOCK FAIBLE :
${lowStockText}

TÂCHES OUVERTES :
${tasksText}

CHIFFRES :
- Commandes totales aujourd'hui : ${orders?.length || 0}
- Chiffre d'affaires estimé du jour : ${revenue.toFixed(2)} €
- Produits en stock faible : ${lowStock.length}
- Tâches ouvertes : ${openTasks.length}

RÈGLE IMPORTANTE :
Une commande avec le statut "livrée" est terminée. Elle ne doit jamais être considérée comme "en préparation".

Ta mission :
Fais un rapport clair et utile avec :
1. Résumé de la journée
2. Chiffre d'affaires
3. Commandes par statut
4. Stock faible
5. Problèmes à surveiller
6. Priorités pour demain

Réponds en français, de façon directe et actionnable.
`;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.2,
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
        newOrders: newOrders.length,
        paidOrders: paidOrders.length,
        preparingOrders: preparingOrders.length,
        deliveryOrders: deliveryOrders.length,
        deliveredOrders: deliveredOrders.length,
        canceledOrders: canceledOrders.length,
        activeOrders: activeOrders.length,
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