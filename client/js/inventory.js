/**
 * Scan2Go Inventory Management & Movement Audit Controller
 */
const inventoryUI = {
  async loadInventoryOverview() {
    try {
      const overview = await api.get('/admin/inventory/overview');
      const movements = await api.get('/admin/inventory/movements');

      this.renderOverview(overview);
      this.renderMovements(movements.movements || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  },

  renderOverview(o) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('inv-total-products', o.total_products);
    setVal('inv-total-units', o.total_units);
    setVal('inv-low-stock-count', o.low_stock_count);
    setVal('inv-out-of-stock-count', o.out_of_stock_count);
  },

  renderMovements(movements) {
    const list = document.getElementById('inventory-movements-table');
    if (!list) return;

    list.innerHTML = movements.map(m => `
      <tr>
        <td>
          <div class="font-bold">${m.products?.name || 'Product'}</div>
          <div class="text-muted" style="font-size:0.75rem;font-family:monospace;">${m.products?.barcode || ''}</div>
        </td>
        <td>${m.previous_quantity}</td>
        <td>
          <span class="badge badge-${m.change_quantity > 0 ? 'success' : 'danger'}">
            ${m.change_quantity > 0 ? '+' : ''}${m.change_quantity}
          </span>
        </td>
        <td><span class="font-bold">${m.new_quantity}</span></td>
        <td>${m.reason}</td>
        <td>${m.profiles?.full_name || 'System'}</td>
        <td>${utils.formatDate(m.created_at)}</td>
      </tr>
    `).join('');
  },

  async handleStockAdjustmentForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      await api.post('/admin/inventory/adjust', body);
      utils.showToast('Stock adjusted successfully!', 'success');
      form.reset();
      this.loadInventoryOverview();
    } catch (err) {
      // Error handled
    }
  }
};
