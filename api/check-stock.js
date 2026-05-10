import { createClient } from "@supabase/supabase-js";

export default async function checkStock(req, res) {
  try {
    const agentos = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sandwich = createClient(
      process.env.SANDWICH_SUPABASE_URL,
      process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: products, error } = await sandwich
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const lowStockProducts = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 5;
    });

    let tasksCreated = 0;
    let alertsCreated = 0;

    for (const product of lowStockProducts) {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      const productName = product.name || product.title || "Produit sans nom";

      const title = `Réapprovisionnement ${productName}`;

      const { data: existingTask } = await agentos
        .from("agent_tasks")
        .select("id")
        .eq("title", title)
        .eq("status", "open")
        .limit(1);

      if (!existingTask || existingTask.length === 0) {
        await agentos.from("agent_tasks").insert([
          {
            title,
            description: `Stock faible détecté : ${productName} (stock actuel : ${stock})`,
            type: "stock_alert",
            priority: stock === 0 ? "urgent" : "high",
            status: "open",
            completed: false,
            from_agent: "Agent Stock",
            to_agent: "Agent Chef d’entreprise"
          }
        ]);

        tasksCreated++;
      }

      const alertMessage = `${productName} presque en rupture (stock : ${stock})`;

      const { data: existingAlert } = await agentos
        .from("agent_alerts")
        .select("id")
        .eq("message", alertMessage)
        .eq("read", false)
        .limit(1);

      if (!existingAlert || existingAlert.length === 0) {
        await agentos.from("agent_alerts").insert([
          {
            title: "Stock faible",
            message: alertMessage,
            priority: stock === 0 ? "urgent" : "high",
            read: false
          }
        ]);

        alertsCreated++;
      }
    }

    return res.status(200).json({
      success: true,
      productsChecked: products?.length || 0,
      lowStockProducts: lowStockProducts.length,
      tasksCreated,
      alertsCreated
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}