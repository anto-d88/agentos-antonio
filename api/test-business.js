import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const url = process.env.SANDWICH_SUPABASE_URL;
    const key =
      process.env.SANDWICH_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        error: "Variables manquantes !"
      });
    }

    const supabase = createClient(url, key);

    const { data: products, error: productsError } =
      await supabase
        .from("products")
        .select("*")
        .limit(5);

    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select("*")
        .limit(5);

    return res.status(200).json({
      success: true,
      productsError,
      ordersError,
      products,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}