/**
 * Scan2Go Customer Order History Controller
 */
const ordersUI = {
  async loadUserOrders() {
    try {
      const orders = await api.get('/orders');
      this.renderOrders(orders || []);
    } catch (err) {
      console.error('Failed to load user orders:', err);
    }
  },

  renderOrders(orders) {
    const listEl = document.getElementById('orders-list');
    if (!listEl) return;

    if (orders.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:3rem;" class="card">
          <h3>No Orders Yet</h3>
          <p class="text-muted">Start shopping by scanning product barcodes in-store.</p>
          <a href="/customer/scanner.html" class="btn btn-primary" style="margin-top:1rem;">Open Scanner</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = orders.map(order => `
      <div class="card" style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div class="font-bold" style="font-size:1.1rem;color:var(--primary-500);">${order.order_number}</div>
          <div class="text-muted" style="font-size:0.85rem;">Date: ${utils.formatDate(order.created_at)}</div>
          <div style="margin-top:0.4rem;" class="font-bold">${utils.formatCurrency(order.total_amount)}</div>
        </div>
        <div style="text-align:right;">
          <div class="badge badge-${order.status === 'EXITED' ? 'info' : order.status === 'PAID' ? 'success' : 'warning'}" style="margin-bottom:0.75rem;">
            ${order.status}
          </div>
          <div>
            <a href="/customer/success.html?order_id=${order.id}" class="btn btn-sm btn-secondary">View Receipt & QR</a>
          </div>
        </div>
      </div>
    `).join('');
  }
};
