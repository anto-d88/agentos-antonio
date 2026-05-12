import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOrderTotal(order) {
  return Number(order.total_amount || order.total_price || 0);
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

function getClients() {
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

  return { agentos, sandwich, groq };
}

function checkEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "Supabase AgentOS non configuré";
  }

  if (
    !process.env.SANDWICH_SUPABASE_URL ||
    !process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY
  ) {
    return "Supabase La Pause Sandwich non configuré";
  }

  return null;
}

async function sendTelegramMessage(message) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return {
        ok: false,
        error: "Telegram non configuré dans Vercel"
      };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function businessOverview(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  const { sandwich } = getClients();

  const { data: orders, error: ordersError } = await sandwich
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (ordersError) throw ordersError;

  const { data: products, error: productsError } = await sandwich
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (productsError) throw productsError;

  const groups = getOrderGroups(orders || []);

  const revenue = groups.revenueOrders.reduce((sum, order) => {
    return sum + getOrderTotal(order);
  }, 0);

  const lowStock = (products || []).filter((product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    return stock <= threshold;
  });

  return res.status(200).json({
    revenue,
    totalOrders: orders?.length || 0,
    deliveredOrders: groups.deliveredOrders.length,
    preparingOrders: groups.preparingOrders.length,
    paidOrders: groups.paidOrders.length,
    deliveryOrders: groups.deliveryOrders.length,
    newOrders: groups.newOrders.length,
    canceledOrders: groups.canceledOrders.length,
    activeOrders: groups.activeOrders.length,
    lowStock,
    products: products || [],
    recentOrders: orders?.slice(0, 10) || []
  });
}

async function checkAlerts(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  const { agentos, sandwich } = getClients();

  const { data: products, error: productsError } = await sandwich
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (productsError) throw productsError;

  const lowStock = (products || []).filter((product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    return stock <= threshold;
  });

  const createdAlerts = [];

  for (const product of lowStock) {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const productName = product.name || product.title || "Produit sans nom";

    const alert = {
      title: "Stock faible",
      message: `${productName} presque en rupture (${stock})`,
      priority: stock === 0 ? "urgent" : "high",
      read: false
    };

    const { data: existing, error: existingError } = await agentos
      .from("agent_alerts")
      .select("id")
      .eq("message", alert.message)
      .eq("read", false)
      .limit(1);

    if (existingError) throw existingError;

    if (!existing || existing.length === 0) {
      const { error: insertError } = await agentos
        .from("agent_alerts")
        .insert([alert]);

      if (insertError) throw insertError;

      createdAlerts.push(alert);
    }
  }

  return res.status(200).json({
    success: true,
    lowStockDetected: lowStock.length,
    alertsCreated: createdAlerts.length,
    alerts: createdAlerts
  });
}

async function checkOrders(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  const { agentos, sandwich } = getClients();

  const { data: orders, error } = await sandwich
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  const actionableOrders = (orders || []).filter((order) => {
    const status = normalizeStatus(order.status);

    return [
      "nouvelle",
      "new",
      "payee",
      "paye",
      "en_preparation",
      "en preparation"
    ].includes(status);
  });

  let created = 0;

  for (const order of actionableOrders) {
    const title = `Commande #${order.id}`;

    const { data: existing } = await agentos
      .from("agent_tasks")
      .select("id")
      .eq("title", title)
      .eq("status", "open")
      .limit(1);

    if (!existing || existing.length === 0) {
      await agentos.from("agent_tasks").insert([
        {
          from_agent: "Surveillance Commandes",
          to_agent: "Agent Commandes",
          title,
          description:
            `Commande ${order.id} - ` +
            `${order.customer_name || "Client"} - ` +
            `${getOrderTotal(order)}€`,
          priority: "high",
          type: "order",
          status: "open",
          completed: false
        }
      ]);

      created++;

      await createLog(agentos, {
  agent_name: "Agent Commandes",
  action_type: "task_created",
  title: "Tâche commande créée",
  description: `Commande ${order.id} envoyée à l'équipe`,
  status: "success",
  priority: "high"
});
    }
  }

  return res.status(200).json({
    success: true,
    orders: orders?.length || 0,
    actionableOrders: actionableOrders.length,
    tasksCreated: created
  });
}

async function checkStock(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  const { agentos, sandwich } = getClients();

  const { data: products, error } = await sandwich
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  let lowStockProducts = 0;
  let tasksCreated = 0;
  let alertsCreated = 0;
  let telegramSent = 0;
  let resetProducts = 0;

  for (const product of products || []) {
    const stock = Number(product.stock_quantity || 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    const productName = product.name || product.title || "Produit sans nom";
    const alertSent = Boolean(product.stock_alert_sent);

    if (stock <= threshold) {
      lowStockProducts++;
    }

    if (stock <= threshold && !alertSent) {
      const title = `Réapprovisionnement ${productName}`;
      const alertMessage = `${productName} presque en rupture (stock : ${stock})`;

      await agentos.from("agent_tasks").insert([
        {
          title,
          description: `Stock faible détecté : ${productName} (stock actuel : ${stock}, seuil : ${threshold})`,
          type: "stock_alert",
          priority: stock === 0 ? "urgent" : "high",
          status: "open",
          completed: false,
          from_agent: "Agent Stock",
          to_agent: "Agent Chef d’entreprise"
        }
      ]);

      tasksCreated++;

      await agentos.from("agent_alerts").insert([
        {
          title: "Stock faible",
          message: alertMessage,
          priority: stock === 0 ? "urgent" : "high",
          read: false
        }
      ]);

      alertsCreated++;

      await createLog(agentos, {
  agent_name: "Agent Stock",
  action_type: "stock_alert",
  title: "Alerte stock créée",
  description: `${productName} est presque en rupture (${stock})`,
  status: "warning",
  priority: stock === 0 ? "urgent" : "high"
});

      const telegramResult = await sendTelegramMessage(
        `🚨 Stock faible La Pause Sandwich\n\n📦 Produit : ${productName}\n📉 Stock actuel : ${stock}\n🎯 Seuil : ${threshold}\n⚠️ Priorité : ${
          stock === 0 ? "URGENT" : "HIGH"
        }`
      );

      if (telegramResult?.ok) {
        telegramSent++;
      }

      await sandwich
        .from("products")
        .update({
          stock_alert_sent: true,
          stock_alert_sent_at: new Date().toISOString(),
          last_stock_alert_level: stock
        })
        .eq("id", product.id);
    }

    if (stock > threshold && alertSent) {
      await sandwich
        .from("products")
        .update({
          stock_alert_sent: false
        })
        .eq("id", product.id);

      resetProducts++;
    }
  }

  return res.status(200).json({
    success: true,
    productsChecked: products?.length || 0,
    lowStockProducts,
    tasksCreated,
    alertsCreated,
    telegramSent,
    resetProducts
  });
}

async function dailyReport(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq non configuré" });
  }

  const { agentos, sandwich, groq } = getClients();

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

  const groups = getOrderGroups(orders || []);
  const revenue = groups.revenueOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  const lowStock = (products || []).filter((product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    return stock <= threshold;
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

COMMANDES AUJOURD'HUI :
${ordersText}

RÉPARTITION DES STATUTS :
- Nouvelles : ${groups.newOrders.length}
- Payées : ${groups.paidOrders.length}
- En préparation : ${groups.preparingOrders.length}
- En livraison : ${groups.deliveryOrders.length}
- Livrées : ${groups.deliveredOrders.length}
- Annulées : ${groups.canceledOrders.length}
- Actives à traiter : ${groups.activeOrders.length}

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

Fais un rapport clair avec :
1. Résumé de la journée
2. Chiffre d'affaires
3. Commandes par statut
4. Stock faible
5. Problèmes à surveiller
6. Priorités pour demain
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }]
  });

  const report =
    completion.choices?.[0]?.message?.content?.trim() ||
    "Rapport impossible à générer.";

  return res.status(200).json({
    success: true,
    stats: {
      ordersToday: orders?.length || 0,
      newOrders: groups.newOrders.length,
      paidOrders: groups.paidOrders.length,
      preparingOrders: groups.preparingOrders.length,
      deliveryOrders: groups.deliveryOrders.length,
      deliveredOrders: groups.deliveredOrders.length,
      canceledOrders: groups.canceledOrders.length,
      activeOrders: groups.activeOrders.length,
      revenue,
      lowStock: lowStock.length,
      openTasks: openTasks.length
    },
    report
  });
}

async function autoDirector(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq non configuré" });
  }

  const { agentos, sandwich, groq } = getClients();

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

  const groups = getOrderGroups(orders || []);

  const lowStock = (products || []).filter((product) => {
    const stock = Number(product.stock_quantity ?? product.stock ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    return stock <= threshold;
  });

  const revenue = groups.revenueOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  const lowStockText =
    lowStock
      .map((product) => {
        const stock = Number(product.stock_quantity ?? product.stock ?? 0);
        return `- ${product.name || product.title || "Produit sans nom"} : ${stock}`;
      })
      .join("\n") || "Aucun stock faible.";

  const prompt = `
Tu es le Directeur Opérationnel IA de La Pause Sandwich.

CHIFFRES :
- CA estimé commandes valides : ${revenue.toFixed(2)} €
- Commandes analysées : ${orders?.length || 0}
- Nouvelles : ${groups.newOrders.length}
- Payées : ${groups.paidOrders.length}
- En préparation : ${groups.preparingOrders.length}
- En livraison : ${groups.deliveryOrders.length}
- Livrées : ${groups.deliveredOrders.length}
- Annulées : ${groups.canceledOrders.length}
- Actives à traiter : ${groups.activeOrders.length}
- Produits en stock faible : ${lowStock.length}

STOCK FAIBLE :
${lowStockText}

RÈGLES :
- Une commande "livrée" est terminée.
- Ne considère jamais une commande livrée comme en préparation.
- Une décision doit être courte et exécutable.
- Crée seulement les décisions vraiment utiles.
- Si tout est correct, retourne [].

Réponds UNIQUEMENT en JSON valide :
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
    messages: [{ role: "user", content: prompt }]
  });

  const raw = completion.choices?.[0]?.message?.content || "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  const decisions = match ? JSON.parse(match[0]) : [];

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

    if (existingTask && existingTask.length > 0) continue;

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

    await createLog(agentos, {
  agent_name: "Agent Commandes",
  action_type: "task_created",
  title: "Tâche commande créée",
  description: `Commande ${order.id} envoyée à l'équipe`,
  status: "success",
  priority: "high"
});
  }

  return res.status(200).json({
    success: true,
    decisions,
    savedDecisions
  });
}

async function checkNewOrders(req, res) {
  const envError = checkEnv();
  if (envError) return res.status(500).json({ error: envError });

  const { sandwich } = getClients();

  const { data: orders, error } = await sandwich
    .from("orders")
    .select("*")
    .eq("notification_sent", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  let sent = 0;

  for (const order of orders || []) {
    await sendTelegramMessage(
      `🛒 Nouvelle commande La Pause Sandwich\n\n👤 Client : ${
        order.customer_name || "Non précisé"
      }\n📞 Téléphone : ${
        order.customer_phone || "Non précisé"
      }\n🏢 Entreprise : ${
        order.company_name || "Non précisé"
      }\n💶 Total : ${
        order.total_amount || order.total_price || 0
      }€\n🕒 Créneau : ${
        order.delivery_slot_label || order.delivery_slot || "Non précisé"
      }\n📍 Adresse : ${order.delivery_address || "Non précisée"}`
    );

    await sandwich
      .from("orders")
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString()
      })
      .eq("id", order.id);

    sent++;

    await createLog(agentos, {
  agent_name: "Agent Commandes",
  action_type: "new_order",
  title: "Nouvelle commande détectée",
  description: `Commande de ${
    order.customer_name || "Client"
  } pour ${
    order.total_amount || order.total_price || 0
  }€`,
  status: "success",
  priority: "high"
});

  }

  return res.status(200).json({
    success: true,
    ordersChecked: orders?.length || 0,
    notificationsSent: sent
  });
}

async function updateAlert(req, res) {
  const { agentos } = getClients();

  const { id, action } = req.body;

  if (!id || !action) {
    return res.status(400).json({
      error: "id et action obligatoires"
    });
  }

  const updates = {};

  if (action === "read") {
    updates.read = true;
    updates.status = "read";
  }

  if (action === "important") {
    updates.important = true;
  }

  if (action === "complete") {
    updates.completed = true;
    updates.status = "completed";
    updates.read = true;
  }

  if (action === "delete") {
    updates.deleted = true;
    updates.status = "deleted";
    updates.read = true;
  }

  const { data, error } = await agentos
    .from("agent_alerts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return res.status(200).json({
    success: true,
    alert: data
  });
}

async function addToPlanning(req, res) {
  try {
    const envError = checkEnv();
    if (envError) return res.status(500).json({ error: envError });

    const { agentos } = getClients();

    const body = req.body || {};

    const title = body.title;
    const description = body.description || "";
    const planned_date = body.planned_date;
    const planned_time =
      body.planned_time && String(body.planned_time).trim() !== ""
        ? String(body.planned_time).slice(0, 5)
        : null;

    const priority = String(body.priority || "medium").toLowerCase();
    const source_type = body.source_type || null;
    const source_id = body.source_id || null;

    if (!title || !planned_date) {
      return res.status(400).json({
        success: false,
        error: "title et planned_date obligatoires"
      });
    }

    const { data: planning, error } = await agentos
      .from("agent_planning")
      .insert([
        {
          title,
          description,
          planned_date,
          planned_time,
          priority,
          source_type,
          source_id,
          status: "planned",
          completed: false
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    if (source_type === "alert" && source_id) {
      await agentos
        .from("agent_alerts")
        .update({
          planned: true,
          status: "planned",
          read: true
        })
        .eq("id", source_id);
    }

    return res.status(200).json({
      success: true,
      planning
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getPlanning(req, res) {
  const { agentos } = getClients();

  const { data, error } = await agentos
    .from("agent_planning")
    .select("*")
    .order("planned_date", { ascending: true })
    .order("planned_time", { ascending: true });

  if (error) throw error;

  return res.status(200).json({
    success: true,
    planning: data || []
  });
}

async function createLog(agentos, log) {
  try {
    await agentos.from("agent_logs").insert([
      {
        agent_name: log.agent_name || "Agent IA",
        action_type: log.action_type || "general",
        title: log.title || "Action système",
        description: log.description || "",
        status: log.status || "success",
        priority: log.priority || "medium",
        metadata: log.metadata || {}
      }
    ]);
  } catch (error) {
    console.error("Erreur création log :", error);
  }
}

async function generatePlanning(req, res) {
  try {
    const envError = checkEnv();

    if (envError) {
      return res.status(500).json({
        success: false,
        error: envError
      });
    }

    const { agentos, groq } = getClients();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const planningDate = tomorrow
      .toISOString()
      .slice(0, 10);

    // tâches ouvertes
    const { data: tasks } = await agentos
      .from("agent_tasks")
      .select("*")
      .neq("status", "done")
      .order("priority", {
        ascending: false
      });

    // alertes non lues
    const { data: alerts } = await agentos
      .from("agent_alerts")
      .select("*")
      .eq("read", false)
      .eq("deleted", false);

    // mémoire opérationnelle
    const { data: memories } = await agentos
      .from("agent_operational_memory")
      .select("*")
      .eq("is_active", true);

    const tasksText =
      (tasks || [])
        .map(
          (t) =>
            `- ${t.title} (${t.priority})`
        )
        .join("\n") || "Aucune tâche.";

    const alertsText =
      (alerts || [])
        .map(
          (a) =>
            `- ${a.title}: ${a.message}`
        )
        .join("\n") || "Aucune alerte.";

    const memoriesText =
      (memories || [])
        .map(
          (m) =>
            `- ${m.title}: ${m.content}`
        )
        .join("\n") || "";

    const prompt = `
Tu es l'Agent Planning IA de La Pause Sandwich.

MISSION :
Créer un planning intelligent et réaliste pour demain.

DATE :
${planningDate}

MÉMOIRE OPÉRATIONNELLE :
${memoriesText}

TÂCHES :
${tasksText}

ALERTES :
${alertsText}

RÈGLES :
- Tu dois créer au minimum 5 actions même si les données sont faibles.
- Organise la journée intelligemment.
- Respecte les créneaux livraison.
- Prévois toujours : vérification commandes, stock/courses, préparation cuisine, livraison, nettoyage, administratif/prospection.
- Réponse UNIQUEMENT en JSON valide.
- Ne mets aucun texte avant ou après le JSON.

FORMAT :
[
  {
    "title": "Préparation cuisine",
    "description": "Préparer les sandwichs du midi",
    "planned_time": "10:30",
    "priority": "high"
  }
]
`;

    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

    const raw =
      completion.choices?.[0]?.message
        ?.content || "[]";

    const match =
      raw.match(/\[[\s\S]*\]/);

    const planning =
      match ? JSON.parse(match[0]) : [];

    const inserted = [];

    for (const item of planning) {
      const { data, error } =
        await agentos
          .from("agent_planning")
          .insert([
            {
              title:
                item.title ||
                "Action IA",

              description:
                item.description || "",

              planned_date:
                planningDate,

              planned_time:
                item.planned_time ||
                null,

              priority:
                item.priority ||
                "medium",

              generated_by_ai: true,

              status: "planned",
              completed: false
            }
          ])
          .select()
          .single();

      if (!error && data) {
        inserted.push(data);
      }
    }

    await createLog(agentos, {
      agent_name:
        "Agent Planning IA",

      action_type:
        "planning_generation",

      title:
        "Planning généré automatiquement",

      description:
        `${inserted.length} actions planifiées pour ${planningDate}`,

      status: "success",
      priority: "high"
    });

return res.status(200).json({
  success: true,
  planningDate,
  generated: inserted.length,
  raw,
  planning: inserted
});
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  try {
    const action = req.query.action;

    if (action === "alert-update") return updateAlert(req, res);
    if (action === "add-to-planning") return addToPlanning(req, res);
    if (action === "get-planning") return getPlanning(req, res);
    if (action === "check-new-orders") return checkNewOrders(req, res);

    if (action === "telegram-test") {
      const result = await sendTelegramMessage(
        "✅ Test Telegram AgentOS réussi"
      );

      return res.status(200).json({
        success: true,
        telegram: result
      });
    }

    if (action === "check-stock") return checkStock(req, res);
    if (action === "business-overview") return businessOverview(req, res);
    if (action === "check-alerts") return checkAlerts(req, res);
    if (action === "check-orders") return checkOrders(req, res);
    if (action === "daily-report") return dailyReport(req, res);
    if (action === "auto-director") return autoDirector(req, res);
    if (action === "generate-planning") {return generatePlanning(req, res);}



    return res.status(400).json({
      error: "Action inconnue",
      actions: [
        "business-overview",
        "check-alerts",
        "check-stock",
        "check-orders",
        "check-new-orders",
        "daily-report",
        "auto-director",
        "telegram-test",
        "alert-update",
        "add-to-planning",
        "get-planning"
      ]
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}