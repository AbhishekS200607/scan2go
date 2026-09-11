/**
 * Scan2Go Admin Dashboard Controller
 */
const adminUI = {
  async loadDashboard() {
    try {
      const metrics = await api.get('/admin/dashboard');
      this.renderMetrics(metrics);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    }
  },

  renderMetrics(m) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('stat-today-sales', utils.formatCurrency(m.today_sales));
    setVal('stat-today-orders', m.today_orders);
    setVal('stat-total-products', m.total_products);
    setVal('stat-stock-units', m.total_stock_units);
    setVal('stat-low-stock', m.low_stock_count);
    setVal('stat-out-of-stock', m.out_of_stock_count);
    setVal('stat-pending-payments', m.pending_payments_count);
    setVal('stat-verified-exits', m.verified_exits_count);

    // Render Recent Orders
    const recOrdersEl = document.getElementById('admin-recent-orders');
    if (recOrdersEl && m.recent_orders) {
      recOrdersEl.innerHTML = m.recent_orders.map(o => `
        <tr>
          <td><span class="font-bold">${o.order_number}</span></td>
          <td>${o.profiles?.full_name || 'Customer'}</td>
          <td>${utils.formatCurrency(o.total_amount)}</td>
          <td><span class="badge badge-${o.status === 'EXITED' ? 'info' : o.status === 'PAID' ? 'success' : 'warning'}">${o.status}</span></td>
          <td>${utils.formatDate(o.created_at)}</td>
        </tr>
      `).join('');
    }

    // Render Low Stock Widget
    const lowStockWidget = document.getElementById('admin-low-stock-list');
    if (lowStockWidget && m.low_stock_items) {
      lowStockWidget.innerHTML = m.low_stock_items.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border-color);">
          <div>
            <div class="font-semibold">${item.name}</div>
            <div class="text-muted" style="font-size:0.75rem;">Barcode: ${item.barcode}</div>
          </div>
          <div>
            <span class="badge badge-warning">${item.stock_quantity} left</span>
          </div>
        </div>
      `).join('');
    }
  },

  async loadAdminProducts() {
    try {
      const data = await api.get('/admin/products', { active_only: false });
      const tableBody = document.getElementById('admin-products-table');
      if (!tableBody) return;

      tableBody.innerHTML = (data.products || []).map(p => `
        <tr>
          <td>
            <div class="font-bold">${p.name}</div>
            <div class="text-muted" style="font-size:0.75rem;">SKU: ${p.sku}</div>
          </td>
          <td style="font-family:monospace;">${p.barcode}</td>
          <td>${utils.formatCurrency(p.price)}</td>
          <td>${p.tax_percent}%</td>
          <td>
            <span class="badge badge-${p.stock_quantity <= p.minimum_stock ? 'warning' : 'success'}">
              ${p.stock_quantity} units
            </span>
          </td>
          <td><span class="badge badge-${p.active ? 'success' : 'danger'}">${p.active ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="adminUI.deactivateProduct('${p.id}')">Deactivate</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load admin products:', err);
    }
  },

  async handleAddProductForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      await api.post('/admin/products', body);
      utils.showToast('New product added successfully!', 'success');
      form.reset();
      setTimeout(() => { window.location.href = '/admin/products.html'; }, 1000);
    } catch (err) {
      // Error handled
    }
  },

  async deactivateProduct(id) {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      utils.showToast('Product deactivated.', 'info');
      this.loadAdminProducts();
    } catch (err) {
      // Error handled
    }
  }
};
