import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: products, error } = await supabase
      .from("products")
      .select("*");

    if (error) {
      throw error;
    }

    const lowStockProducts = products.filter((p) => {
      const stock =
        Number(p.stock || p.stock_quantity || 0);

      return stock <= 5;
    });

    let tasksCreated = 0;

    for (const product of lowStockProducts) {
      const existingTask = await supabase
        .from("agent_tasks")
        .select("id")
        .eq("type", "stock_alert")
        .eq("status", "OPEN")
        .ilike("title", `%${product.name}%`)
        .maybeSingle();

      if (existingTask.data) {
        continue;
      }

      await supabase
        .from("agent_tasks")
        .insert([
          {
            title: `Réapprovisionnement ${product.name}`,
            description:
              `Stock faible détecté : ${product.name} ` +
              `(stock actuel : ${product.stock})`,
            type: "stock_alert",
            priority: "HIGH",
            status: "OPEN",
            from_agent: "Agent Stock",
            to_agent: "Agent Chef d’entreprise"
          }
        ]);

      await supabase
        .from("agent_alerts")
        .insert([
          {
            title: "Stock faible",
            message:
              `${product.name} presque en rupture ` +
              `(stock : ${product.stock})`,
            severity: "HIGH"
          }
        ]);

      tasksCreated++;
    }

    return res.status(200).json({
      success: true,
      lowStockProducts: lowStockProducts.length,
      tasksCreated
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}