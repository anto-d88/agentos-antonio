import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const agentosUrl = process.env.SUPABASE_URL;
    const agentosKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sandwichUrl = process.env.SANDWICH_SUPABASE_URL;
    const sandwichKey = process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY;

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

    const agentos = createClient(agentosUrl, agentosKey);
    const sandwich = createClient(sandwichUrl, sandwichKey);

    const { data: products, error: productsError } = await sandwich
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productsError) throw productsError;

    const lowStock = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 3;
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
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}