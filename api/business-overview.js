import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const sandwichUrl = process.env.SANDWICH_SUPABASE_URL;
    const sandwichKey = process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY;

    if (!sandwichUrl || !sandwichKey) {
      return res.status(500).json({
        error: "Variables Supabase Sandwich manquantes"
      });
    }

    const sandwichSupabase = createClient(sandwichUrl, sandwichKey);

    const { data: orders, error: ordersError } = await sandwichSupabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersError) throw ordersError;

    const { data: products, error: productsError } = await sandwichSupabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productsError) throw productsError;

    const paidStatuses = ["payée", "payee", "livrée", "livree", "en_preparation"];

    const paidOrders = (orders || []).filter((order) =>
      paidStatuses.includes(String(order.status || "").toLowerCase())
    );

    const revenue = paidOrders.reduce((sum, order) => {
      return sum + Number(order.total_amount || order.total_price || 0);
    }, 0);

    const lowStock = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 3;
    });

    return res.status(200).json({
      revenue,
      totalOrders: orders?.length || 0,
      paidOrders: paidOrders.length,
      lowStock,
      products: products || [],
      recentOrders: orders?.slice(0, 10) || []
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}