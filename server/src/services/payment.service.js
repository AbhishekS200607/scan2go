const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const orderService = require('./order.service');
const qrService = require('./qr.service');
const logger = require('../utils/logger');

/**
 * Payment Provider Abstraction Layer
 */
class MockPaymentProvider {
  async processPayment({ order_id, amount, payment_method = 'CARD_SIMULATION' }) {
    // Simulate payment transaction with provider reference
    const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    return {
      success: true,
      transaction_id: transactionId,
      status: 'SUCCESS',
      paid_at: new Date().toISOString()
    };
  }
}

const paymentProvider = new MockPaymentProvider();

const paymentService = {
  /**
   * Create & Execute Payment for an Order (Server Verified)
   */
  async processOrderPayment(userId, orderId, paymentPayload = {}) {
    // 1. Fetch order & verify user ownership
    const order = await orderService.getOrderById(orderId, userId);
    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    if (order.status === 'PAID' || order.status === 'VERIFIED' || order.status === 'EXITED') {
      if (order.status === 'EXITED') {
        const err = new Error('This checkout pass has already been used to exit the supermarket.');
        err.statusCode = 400;
        err.code = 'ORDER_EXITED';
        throw err;
      }

      let qrPass = order.checkout_token;
      if (!qrPass || qrPass.status === 'EXPIRED') {
        qrPass = await qrService.generateCheckoutToken(order.id);
      }
      return {
        order_id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        payment_status: 'SUCCESS',
        transaction_id: order.payment ? order.payment.provider_transaction_id : 'ALREADY_PAID',
        qr_pass: qrPass
      };
    }

    // Update status to PAYMENT_PROCESSING
    this.updateOrderStatus(order.id, 'PAYMENT_PROCESSING');

    // 2. Execute Payment via Payment Provider Abstraction
    const result = await paymentProvider.processPayment({
      order_id: order.id,
      amount: order.total_amount,
      payment_method: paymentPayload.payment_method || 'CARD_SIMULATION'
    });

    if (!result.success || result.status !== 'SUCCESS') {
      await this.updateOrderStatus(order.id, 'PAYMENT_FAILED');
      const err = new Error('Payment transaction failed.');
      err.statusCode = 400;
      err.code = 'PAYMENT_FAILED';
      throw err;
    }

    // 3. Record Payment Record
    const paymentRecord = {
      id: require('crypto').randomUUID(),
      order_id: order.id,
      provider: 'mock',
      provider_transaction_id: result.transaction_id,
      amount: order.total_amount,
      currency: 'INR',
      status: 'SUCCESS',
      paid_at: result.paid_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { error: payErr } = await supabase.from('payments').insert([paymentRecord]);
      if (payErr) throw payErr;
    } else {
      localDb.payments.push(paymentRecord);
    }

    // 4. Safely Decrease Stock for purchased items & Record Inventory Movements
    await this.deductOrderStock(order.id, order.items, userId);

    // 5. Update Order Status to PAID
    await this.updateOrderStatus(order.id, 'PAID');

    // 6. Generate Cryptographic QR Pass Token
    const qrPass = await qrService.generateCheckoutToken(order.id);

    logger.info(`Order ${order.order_number} paid successfully. QR Pass token generated.`);

    return {
      order_id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      payment_status: 'SUCCESS',
      transaction_id: result.transaction_id,
      qr_pass: qrPass
    };
  },

  /**
   * Deduct stock for order items safely
   */
  async deductOrderStock(orderId, items, userId) {
    for (const item of items) {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (prod) {
          const prevQty = prod.stock_quantity;
          const newQty = Math.max(0, prevQty - item.quantity);
          await supabase.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id);

          await supabase.from('inventory_movements').insert([{
            product_id: item.product_id,
            previous_quantity: prevQty,
            change_quantity: -item.quantity,
            new_quantity: newQty,
            reason: `Self-Checkout Sale (Order ${orderId})`,
            reference_type: 'SALE',
            reference_id: orderId,
            performed_by: userId
          }]);
        }
      } else {
        const prod = localDb.products.find(p => p.id === item.product_id);
        if (prod) {
          const prevQty = prod.stock_quantity;
          const newQty = Math.max(0, prevQty - item.quantity);
          prod.stock_quantity = newQty;
          prod.updated_at = new Date().toISOString();

          localDb.inventory_movements.push({
            id: 'inv-' + Date.now() + Math.random().toString(36).substring(2, 5),
            product_id: item.product_id,
            previous_quantity: prevQty,
            change_quantity: -item.quantity,
            new_quantity: newQty,
            reason: `Self-Checkout Sale (Order ${orderId})`,
            reference_type: 'SALE',
            reference_id: orderId,
            performed_by: userId,
            created_at: new Date().toISOString()
          });
        }
      }
    }
  },

  /**
   * Helper to update order status
   */
  async updateOrderStatus(orderId, newStatus) {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
    } else {
      const ord = localDb.orders.find(o => o.id === orderId);
      if (ord) {
        ord.status = newStatus;
        ord.updated_at = new Date().toISOString();
      }
    }
  }
};

module.exports = paymentService;
