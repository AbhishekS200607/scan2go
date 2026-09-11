/**
 * Scan2Go Checkout & QR Pass Controller
 */
const checkoutUI = {
  currentOrder: null,

  async initCheckout() {
    const itemsEl = document.getElementById('checkout-items-summary');
    const btn = document.getElementById('btn-pay-now');
    
    if (itemsEl) {
      itemsEl.innerHTML = '<div style="text-align:center;padding:2rem 0;"><span class="spinner"></span><p class="text-muted" style="margin-top:0.5rem;">Preparing your order summary...</p></div>';
    }
    if (btn) btn.disabled = true;

    try {
      // 1. Create Order from Cart
      const order = await api.post('/orders');
      this.currentOrder = order;
      this.renderOrderReview(order);
      if (btn) btn.disabled = false;
    } catch (err) {
      console.error('Checkout error:', err);
      if (itemsEl) {
        itemsEl.innerHTML = `
          <div style="text-align:center;padding:2rem 1rem;">
            <div style="margin-bottom:0.75rem;color:var(--text-muted);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <h4 style="margin-bottom:0.4rem;color:var(--primary-dark);">Unable to process checkout</h4>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:1rem;">${err.message || 'Your cart may be empty or has changed.'}</p>
            <a href="/customer/cart.html" class="btn btn-primary btn-sm">Return to Cart</a>
          </div>
        `;
      }
      if (btn) btn.disabled = true;
    }
  },

  renderOrderReview(order) {
    const orderNumEl = document.getElementById('checkout-order-number');
    const itemsEl = document.getElementById('checkout-items-summary');
    const totalEl = document.getElementById('checkout-total-amount');

    if (orderNumEl) orderNumEl.textContent = order.order_number;
    if (totalEl) totalEl.textContent = utils.formatCurrency(order.total_amount);

    if (itemsEl && order.items) {
      itemsEl.innerHTML = order.items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border-color);">
          <div>
            <div class="font-semibold">${item.product_name_snapshot}</div>
            <div class="text-muted" style="font-size:0.8rem;">Qty: ${item.quantity} × ${utils.formatCurrency(item.unit_price)}</div>
          </div>
          <div class="font-bold">${utils.formatCurrency(item.line_total)}</div>
        </div>
      `).join('');
    }
  },

  async processMockPayment() {
    if (!this.currentOrder) return;
    const btn = document.getElementById('btn-pay-now');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;"></span> Processing Payment...';
    }

    try {
      const result = await api.post('/payments/verify', {
        order_id: this.currentOrder.id,
        payment_method: 'CARD_SIMULATION'
      });

      utils.showToast('Payment verified successfully!', 'success');
      if (window.notificationsUI) {
        notificationsUI.addNotification({
          title: '✅ Payment Verified!',
          message: `Order #${this.currentOrder.order_number || ''} is paid. Single-use QR pass generated for store exit gate.`,
          type: 'order'
        });
      }
      setTimeout(() => {
        window.location.href = `/customer/success.html?order_id=${this.currentOrder.id}&token=${result.qr_pass.raw_token}`;
      }, 1000);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Retry Payment';
      }
    }
  },

  async renderSuccessQRPage() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const rawToken = params.get('token');

    if (!orderId) {
      window.location.href = '/customer/orders.html';
      return;
    }

    try {
      const order = await api.get(`/orders/${orderId}`);
      
      const orderNumEl = document.getElementById('qr-order-number');
      const amountEl = document.getElementById('qr-total-amount');
      const statusEl = document.getElementById('qr-order-status');
      const qrCanvas = document.getElementById('qr-code-canvas');

      if (orderNumEl) orderNumEl.textContent = order.order_number;
      if (amountEl) amountEl.textContent = utils.formatCurrency(order.total_amount);
      if (statusEl) {
        statusEl.textContent = order.status;
        statusEl.className = `badge badge-${order.status === 'EXITED' ? 'info' : 'success'}`;
      }

      // Prefer clean, high-contrast Order Reference payload (e.g. SG-482318) for ultra-fast camera resolution
      const qrPayload = order.order_number || rawToken || (order.checkout_token ? order.checkout_token.raw_token : order.id);

      const backupRefTip = document.getElementById('backup-order-ref-tip');
      const backupTokenInput = document.getElementById('backup-pass-token');
      if (backupRefTip) backupRefTip.textContent = order.order_number || 'N/A';
      if (backupTokenInput) backupTokenInput.value = order.order_number || qrPayload;

      if (typeof QRCode !== 'undefined' && qrCanvas) {
        qrCanvas.innerHTML = '';
        new QRCode(qrCanvas, {
          text: qrPayload,
          width: 240,
          height: 240,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    } catch (err) {
      console.error('Failed to render QR success page:', err);
    }
  }
};
