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

    const { data: orders, error: ordersError } = await sandwich
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (ordersError) throw ordersError;

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

    const createdTasks = [];
    const createdAlerts = [];

    for (const order of actionableOrders) {
      const orderId = order.id;
      const status = normalizeStatus(order.status);
      const customerName = order.customer_name || "Client";
      const total = getOrderTotal(order);

      const title = `Commande à traiter #${orderId}`;
      const description = `Commande ${orderId} - ${customerName} - statut : ${
        order.status
      } - total : ${total.toFixed(2)}€ - créneau : ${
        order.delivery_slot_label || order.delivery_slot || "non précisé"
      }`;

      const { data: existingTask, error: existingTaskError } = await agentos
        .from("agent_tasks")
        .select("id")
        .eq("title", title)
        .eq("status", "open")
        .limit(1);

      if (existingTaskError) throw existingTaskError;

      if (!existingTask || existingTask.length === 0) {
        const priority =
          status === "nouvelle" || status === "new" ? "urgent" : "high";

        const { data: insertedTask, error: insertTaskError } = await agentos
          .from("agent_tasks")
          .insert([
            {
              from_agent: "Surveillance Commandes",
              to_agent: "Agent Commandes",
              title,
              description,
              priority,
              type: "order",
              status: "open",
              completed: false,
              metadata: {
                order_id: orderId,
                customer_name: customerName,
                status: order.status,
                total,
                delivery_slot: order.delivery_slot,
                delivery_slot_label: order.delivery_slot_label
              }
            }
          ])
          .select()
          .single();

        if (insertTaskError) throw insertTaskError;

        createdTasks.push(insertedTask);
      }

      const alertMessage = `Commande ${orderId} à traiter (${customerName}) - ${total.toFixed(
        2
      )}€`;

      const { data: existingAlert, error: existingAlertError } = await agentos
        .from("agent_alerts")
        .select("id")
        .eq("message", alertMessage)
        .eq("read", false)
        .limit(1);

      if (existingAlertError) throw existingAlertError;

      if (!existingAlert || existingAlert.length === 0) {
        const { data: insertedAlert, error: insertAlertError } = await agentos
          .from("agent_alerts")
          .insert([
            {
              title: "Commande à traiter",
              message: alertMessage,
              priority:
                status === "nouvelle" || status === "new" ? "urgent" : "high",
              read: false
            }
          ])
          .select()
          .single();

        if (insertAlertError) throw insertAlertError;

        createdAlerts.push(insertedAlert);
      }
    }

    return res.status(200).json({
      success: true,
      ordersChecked: orders?.length || 0,
      actionableOrders: actionableOrders.length,
      tasksCreated: createdTasks.length,
      alertsCreated: createdAlerts.length,
      tasks: createdTasks,
      alerts: createdAlerts
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}