import { createClient } from "@supabase/supabase-js";

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOrderTotal(order) {
  return Number(order.total_amount || 0);
}

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
      }
    }

    return res.status(200).json({
      success: true,
      orders: orders?.length || 0,
      actionableOrders: actionableOrders.length,
      tasksCreated: created
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}