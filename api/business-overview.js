import { createClient } from "@supabase/supabase-js";

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOrderGroups(orders = []) {
  const deliveredOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["livree", "livre"].includes(status);
  });

  const preparingOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["en_preparation", "en preparation"].includes(status);
  });

  const paidOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["payee", "paye"].includes(status);
  });

  const deliveryOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["en_livraison", "en livraison"].includes(status);
  });

  const newOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["nouvelle", "new"].includes(status);
  });

  const canceledOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    return ["annulee", "annule", "cancelled", "canceled"].includes(status);
  });

  const revenueOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);

    return [
      "payee",
      "paye",
      "en_preparation",
      "en preparation",
      "en_livraison",
      "en livraison",
      "livree",
      "livre"
    ].includes(status);
  });

  const activeOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);

    return [
      "nouvelle",
      "new",
      "payee",
      "paye",
      "en_preparation",
      "en preparation",
      "en_livraison",
      "en livraison"
    ].includes(status);
  });

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

function getOrderTotal(order) {
  return Number(order.total_amount || order.total_price || 0);
}

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

    const {
      deliveredOrders,
      preparingOrders,
      paidOrders,
      deliveryOrders,
      newOrders,
      canceledOrders,
      revenueOrders,
      activeOrders
    } = getOrderGroups(orders || []);

    const revenue = revenueOrders.reduce((sum, order) => {
      return sum + getOrderTotal(order);
    }, 0);

    const lowStock = (products || []).filter((product) => {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0);
      return stock <= 3;
    });

    return res.status(200).json({
      revenue,
      totalOrders: orders?.length || 0,

      deliveredOrders: deliveredOrders.length,
      preparingOrders: preparingOrders.length,
      paidOrders: paidOrders.length,
      deliveryOrders: deliveryOrders.length,
      newOrders: newOrders.length,
      canceledOrders: canceledOrders.length,
      activeOrders: activeOrders.length,

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