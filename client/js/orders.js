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
          <h3>No Orders Found</h3>
          <p class="text-muted">Start shopping by scanning product barcodes in-store.</p>
          <a href="/customer/scanner.html" class="btn btn-primary" style="margin-top:1rem;">Open Camera Scanner</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = orders.map((order, index) => {
      const items = order.items || order.order_items || [];
      const calculatedItemsTotal = items.reduce((acc, i) => acc + (parseFloat(i.line_total) || (parseFloat(i.unit_price) * (i.quantity || 1)) || 0), 0);
      const grandTotal = parseFloat(order.total_amount) || calculatedItemsTotal || 0;
      const subtotalNet = order.subtotal ? parseFloat(order.subtotal) : (grandTotal / 1.05);
      const taxAmount = order.tax_amount ? parseFloat(order.tax_amount) : (grandTotal - subtotalNet);
      const passToken = order.checkout_tokens?.raw_token || '';

      return `
        <div class="card print-section" style="margin-bottom:1.25rem;box-shadow:var(--shadow-md);border:1px solid var(--border-color);">
          
          <!-- Order Card Summary Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border-color);padding-bottom:0.85rem;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span class="font-bold" style="font-size:1.15rem;color:var(--primary-dark);font-family:monospace;">#${order.order_number}</span>
                <span class="badge badge-${order.status === 'EXITED' ? 'info' : order.status === 'PAID' ? 'success' : 'warning'}" style="font-size:0.75rem;">
                  ${order.status}
                </span>
              </div>
              <div class="text-muted" style="font-size:0.78rem;margin-top:0.25rem;">
                Date: ${utils.formatDate(order.created_at)} • ${items.length} Items Purchased
              </div>
            </div>
            
            <div style="text-align:right;">
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Total Paid</div>
              <div class="font-bold" style="font-size:1.25rem;color:var(--accent-green-dark);">${utils.formatCurrency(grandTotal)}</div>
            </div>
          </div>

          <!-- Itemized Tax Invoice Details -->
          <div class="invoice-box" style="background:#fafbfc;border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:1rem;margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <div style="font-size:0.85rem;font-weight:800;color:var(--primary-dark);">
                Digital Tax Invoice & Receipt Details
              </div>
              <span style="font-size:0.72rem;color:var(--text-muted);">GSTIN: 27AAACS2006G1Z9</span>
            </div>

            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.82rem;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;">
                <thead>
                  <tr style="background:#f1f5f9;color:var(--primary-dark);text-align:left;border-bottom:1px solid #cbd5e1;">
                    <th style="padding:0.45rem 0.6rem;width:25px;">#</th>
                    <th style="padding:0.45rem 0.6rem;">Product Name & Barcode</th>
                    <th style="padding:0.45rem 0.6rem;text-align:center;width:45px;">Qty</th>
                    <th style="padding:0.45rem 0.6rem;text-align:right;width:80px;">Unit Price</th>
                    <th style="padding:0.45rem 0.6rem;text-align:right;width:85px;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.length > 0 ? items.map((item, idx) => {
                    const qty = item.quantity || 1;
                    const lineTot = parseFloat(item.line_total) || (parseFloat(item.unit_price) * qty) || 0;
                    const unitP = parseFloat(item.unit_price) || (lineTot / qty);
                    return `
                      <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:0.45rem 0.6rem;color:var(--text-muted);">${idx + 1}</td>
                        <td style="padding:0.45rem 0.6rem;">
                          <div style="font-weight:700;color:var(--primary-dark);">${item.product_name_snapshot || item.name || 'Product Item'}</div>
                          <div style="font-family:monospace;font-size:0.7rem;color:var(--text-muted);">${item.barcode_snapshot || item.barcode || 'N/A'}</div>
                        </td>
                        <td style="padding:0.45rem 0.6rem;text-align:center;font-weight:700;background:#f8fafc;">${qty}</td>
                        <td style="padding:0.45rem 0.6rem;text-align:right;">${utils.formatCurrency(unitP)}</td>
                        <td style="padding:0.45rem 0.6rem;text-align:right;font-weight:800;color:var(--primary-dark);">${utils.formatCurrency(lineTot)}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="5" style="padding:0.75rem;text-align:center;color:var(--text-muted);">Itemized details snapshot preserved in order record.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- Financial Totals Summary -->
            <div style="background:#ffffff;padding:0.75rem;border-radius:6px;border:1px solid #e2e8f0;max-width:280px;margin-left:auto;margin-top:0.75rem;font-size:0.8rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;color:var(--text-muted);">
                <span>Net Subtotal:</span>
                <span>${utils.formatCurrency(subtotalNet)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;color:var(--text-muted);">
                <span>GST (5% Included):</span>
                <span>${utils.formatCurrency(taxAmount)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:0.35rem;border-top:1px solid #e2e8f0;font-weight:800;color:var(--primary-dark);">
                <span>Total Paid:</span>
                <span style="color:var(--accent-green-dark);">${utils.formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <!-- Actions Toolbar -->
          <div class="no-print" style="display:flex;gap:0.6rem;justify-content:flex-end;flex-wrap:wrap;">
            <button onclick="window.print()" class="btn btn-secondary btn-sm" style="font-size:0.78rem;padding:0.4rem 0.75rem;display:flex;align-items:center;gap:4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Tax Invoice PDF
            </button>
            <a href="/customer/success.html?order_id=${order.id}${passToken ? '&token=' + passToken : ''}" class="btn btn-primary btn-sm" style="font-size:0.78rem;padding:0.4rem 0.85rem;display:flex;align-items:center;gap:4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
              View QR Exit Pass
            </a>
          </div>

        </div>
      `;
    }).join('');
  }
};
