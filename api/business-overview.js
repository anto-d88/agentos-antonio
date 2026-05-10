import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SANDWICH_SUPABASE_URL,
      process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: products } = await supabase
      .from("products")
      .select("*");

    const paidOrders =
      orders?.filter(
        (o) =>
          o.status === "payée" ||
          o.status === "livrée" ||
          o.status === "en_preparation"
      ) || [];

    const revenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    const lowStock =
      products?.filter(
        (p) =>
          Number(
            p.stock_quantity || p.stock || 0
          ) <= 3
      ) || [];

    return res.status(200).json({
      revenue,
      totalOrders: orders?.length || 0,
      paidOrders: paidOrders.length,
      lowStock,
      recentOrders: orders?.slice(0, 10) || []
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}