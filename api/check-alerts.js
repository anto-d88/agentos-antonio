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

    const { data: products } = await sandwich
      .from("products")
      .select("*");

    const lowStock = (products || []).filter((p) => {
      const stock = Number(
        p.stock_quantity ?? p.stock ?? 0
      );

      return stock <= 3;
    });

    const alertsToCreate = [];

    for (const product of lowStock) {
      alertsToCreate.push({
        title: "Stock faible",
        message: `${
          product.name || product.title
        } presque en rupture (${product.stock_quantity ?? product.stock ?? 0})`,
        priority: "high"
      });
    }

    for (const alert of alertsToCreate) {
      const { data: existing } = await agentos
        .from("agent_alerts")
        .select("id")
        .eq("message", alert.message)
        .eq("read", false)
        .limit(1);

      if (!existing || existing.length === 0) {
        await agentos.from("agent_alerts").insert([
          alert
        ]);
      }
    }

    return res.status(200).json({
      success: true,
      alertsCreated: alertsToCreate.length
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}