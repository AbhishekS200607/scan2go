/**
 * Scan2Go Cart UI & State Controller (Optimized Zero-Lag Execution + Smooth Motion)
 * Matches Official Scan2Go Mobile UI Design Specification
 */
const cartUI = {
  cartState: null,

  async loadCart() {
    const listEl = document.getElementById('cart-items-list');
    if (listEl) {
      listEl.innerHTML = `<div style="text-align:center;padding:3rem;"><span class="spinner" style="width:28px;height:28px;color:var(--primary-dark);"></span></div>`;
    }
    try {
      const cart = await api.get('/cart');
      this.cartState = cart;
      this.renderCart(cart);
      return cart;
    } catch (err) {
      console.error('Failed to load cart:', err);
      if (listEl) {
        listEl.innerHTML = `
          <div style="text-align:center;padding:3rem 1rem;" class="card">
            <h3>Unable to load cart</h3>
            <p class="text-muted">Please check your connection and try again.</p>
          </div>
        `;
      }
    }
  },

  renderCart(cart) {
    if (!cart) return;
    this.cartState = cart;

    const cartCountEls = document.querySelectorAll('.cart-count');
    cartCountEls.forEach(el => {
      el.textContent = cart.total_items || 0;
    });

    const listEl = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const clearBtn = document.getElementById('btn-clear-cart');

    if (subtotalEl) subtotalEl.textContent = utils.formatCurrency(cart.subtotal);
    if (taxEl) taxEl.textContent = utils.formatCurrency(cart.tax_amount);
    if (totalEl) totalEl.textContent = utils.formatCurrency(cart.total_amount);

    if (!listEl) return;

    if (!cart.items || cart.items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;" class="card animate-fade-in">
          <div style="margin-bottom:1rem;color:var(--text-muted);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </div>
          <h3>Your cart is empty</h3>
          <p class="text-muted" style="margin-bottom:1.5rem;">Scan product barcodes in the store to build your self-checkout cart.</p>
          <a href="/customer/scanner.html" class="btn btn-primary">Scan Product Barcode</a>
        </div>
      `;
      const checkoutBtn = document.getElementById('btn-proceed-checkout');
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
      return;
    }

    if (clearBtn) clearBtn.disabled = false;
    const checkoutBtn = document.getElementById('btn-proceed-checkout');
    if (checkoutBtn) checkoutBtn.disabled = false;

    listEl.innerHTML = cart.items.map((item, idx) => `
      <div class="cart-item animate-fade-in" style="animation-delay: ${idx * 0.05}s;">
        <div class="cart-item-badge" style="width:44px;height:44px;border-radius:10px;background:rgba(0,108,73,0.12);color:var(--secondary, #006c49);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </div>
        <div style="flex:1;">
          <div class="font-bold" style="font-size:1rem;color:var(--text-main);">${item.name}</div>
          <div class="text-muted" style="font-size:0.78rem;font-family:monospace;">${item.barcode}</div>
          <div style="color:var(--primary-dark);font-weight:700;margin-top:0.25rem;">${utils.formatCurrency(item.unit_price)} <span class="text-muted" style="font-size:0.75rem;">(+${item.tax_percent}% Tax)</span></div>
        </div>

        <!-- Stepper Control Pill matching target spec -->
        <div class="quantity-stepper">
          <button class="stepper-btn" onclick="cartUI.updateQuantity('${item.cart_item_id}', ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
          <span class="stepper-val">${item.quantity}</span>
          <button class="stepper-btn plus" onclick="cartUI.updateQuantity('${item.cart_item_id}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
        </div>

        <button class="favorite-btn" onclick="cartUI.removeItem('${item.cart_item_id}')" style="position:relative;top:0;right:0;color:var(--danger);" title="Remove Item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');
  },

  async addToCart(productId, barcode, quantity = 1, sourceEvent = null) {
    // Trigger Smooth Fly-To-Cart Particle Animation
    if (sourceEvent && sourceEvent.target) {
      utils.animateFlyToCart(sourceEvent.target);
    } else if (window.event && window.event.target) {
      utils.animateFlyToCart(window.event.target);
    }

    // Zero-lag Optimistic UI update
    const cartCountEls = document.querySelectorAll('.cart-count');
    const currentCount = parseInt(cartCountEls[0]?.textContent || '0', 10);
    const newOptimisticCount = currentCount + quantity;

    cartCountEls.forEach(el => {
      el.textContent = newOptimisticCount;
    });

    utils.showToast('Item added to cart!', 'success');
    if (window.notificationsUI) {
      notificationsUI.addNotification({
        title: '🛒 Item Added to Cart',
        message: 'Product added to your active self-checkout session.',
        type: 'system'
      });
    }

    try {
      const updatedCart = await api.post('/cart/items', { product_id: productId, barcode, quantity });
      this.renderCart(updatedCart);
    } catch (err) {
      this.loadCart();
    }
  },

  async updateQuantity(itemId, newQuantity) {
    try {
      const updatedCart = await api.patch(`/cart/items/${itemId}`, { quantity: newQuantity });
      this.renderCart(updatedCart);
    } catch (err) {
      // Handled
    }
  },

  async removeItem(itemId) {
    try {
      const updatedCart = await api.delete(`/cart/items/${itemId}`);
      this.renderCart(updatedCart);
      utils.showToast('Item removed.', 'info');
    } catch (err) {
      // Handled
    }
  },

  async clearCart() {
    try {
      const updatedCart = await api.delete('/cart');
      this.renderCart(updatedCart);
      utils.showToast('Cart cleared.', 'info');
    } catch (err) {
      // Handled
    }
  }
};
