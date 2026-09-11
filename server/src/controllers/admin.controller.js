const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const inventoryService = require('../services/inventory.service');
const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../utils/response');

const adminController = {
  /**
   * Get High-Level Dashboard Analytics & Visual Chart Metrics
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const inventoryOverview = await inventoryService.getInventoryOverview();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      let todaySales = 0;
      let todayOrdersCount = 0;
      let pendingPaymentsCount = 0;
      let verifiedExitsCount = 0;
      let totalCustomers = 0;
      let recentOrders = [];
      let salesChartData = [];

      if (isSupabaseConfigured) {
        const supabase = getSupabase();

        // 1. Today's Paid / Exited Orders
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('total_amount, status')
          .gte('created_at', todayStart);

        if (todayOrders) {
          todayOrdersCount = todayOrders.length;
          todaySales = todayOrders
            .filter(o => ['PAID', 'VERIFIED', 'EXITED'].includes(o.status))
            .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
          pendingPaymentsCount = todayOrders.filter(o => o.status === 'PENDING').length;
          verifiedExitsCount = todayOrders.filter(o => o.status === 'EXITED').length;
        }

        // 2. Total Customers
        const { count: customerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        totalCustomers = customerCount || 0;

        // 3. Recent 5 Orders
        const { data: recOrders } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, status, created_at, profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(5);
        recentOrders = recOrders || [];
      } else {
        // Local DB Analytics calculation
        const todayOrders = localDb.orders.filter(o => new Date(o.created_at) >= new Date(todayStart));
        todayOrdersCount = todayOrders.length;
        todaySales = todayOrders
          .filter(o => ['PAID', 'VERIFIED', 'EXITED'].includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

        pendingPaymentsCount = localDb.orders.filter(o => o.status === 'PENDING').length;
        verifiedExitsCount = localDb.orders.filter(o => o.status === 'EXITED').length;
        totalCustomers = localDb.profiles.filter(p => p.role === 'customer').length;

        recentOrders = localDb.orders
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(o => {
            const p = localDb.profiles.find(pr => pr.id === o.user_id);
            return { ...o, profiles: p ? { full_name: p.full_name } : null };
          });
      }

      // Generate 7-day Sales Chart Data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      salesChartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayLabel = days[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];

        const dayOrders = localDb.orders.filter(o => o.created_at.startsWith(dateStr) && ['PAID', 'VERIFIED', 'EXITED'].includes(o.status));
        const revenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        return {
          day: dayLabel,
          date: dateStr,
          revenue: parseFloat(revenue.toFixed(2)),
          orders: dayOrders.length
        };
      });

      return sendSuccess(res, {
        today_sales: parseFloat(todaySales.toFixed(2)),
        today_orders: todayOrdersCount,
        total_products: inventoryOverview.total_products,
        total_stock_units: inventoryOverview.total_units,
        low_stock_count: inventoryOverview.low_stock_count,
        out_of_stock_count: inventoryOverview.out_of_stock_count,
        pending_payments_count: pendingPaymentsCount,
        verified_exits_count: verifiedExitsCount,
        total_customers: totalCustomers,
        recent_orders: recentOrders,
        sales_chart: salesChartData,
        low_stock_items: inventoryOverview.low_stock_items.slice(0, 5)
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Customers List (Admin)
   */
  async getCustomers(req, res, next) {
    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
        if (error) throw error;
        return sendSuccess(res, data);
      }
      const customers = localDb.profiles.filter(p => p.role === 'customer');
      return sendSuccess(res, customers);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get All Orders (Admin)
   */
  async getAllOrders(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const data = await orderService.getAllOrders({ status, page, limit });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
