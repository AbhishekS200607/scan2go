/**
 * Scan2Go Products Catalog & Search Controller (Smooth Motion & Transitions)
 * Matches Official Scan2Go Mobile UI Design Specification
 */
const productsUI = {
  activeCategory: null,
  searchQuery: '',
  allProducts: [],

  async initCatalog() {
    await this.loadCategories();
    await this.loadProducts();
  },

  async loadCategories() {
    try {
      const categories = await api.get('/products/categories');
      const container = document.getElementById('category-bar');
      if (!container) return;

      container.innerHTML = `
        <div class="category-chip active" onclick="productsUI.filterCategory(null, this)">All</div>
        ${categories.map(c => `
          <div class="category-chip" onclick="productsUI.filterCategory('${c.id}', this)">${c.name}</div>
        `).join('')}
      `;
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  },

  async loadProducts() {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 3rem;"><span class="spinner" style="width:28px;height:28px;color:var(--primary-dark);"></span></div>`;
    }
    try {
      const params = {};
      if (this.activeCategory) params.category_id = this.activeCategory;
      if (this.searchQuery) params.search = this.searchQuery;

      const data = await api.get('/products', params);
      this.allProducts = data.products || [];
      this.renderProducts(this.allProducts);
    } catch (err) {
      console.error('Failed to load products:', err);
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align:center; padding: 3rem;" class="card">
            <h3>Unable to load products</h3>
            <p class="text-muted">Please check your network connection and try again.</p>
          </div>
        `;
      }
    }
  },

  renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 3rem;" class="card animate-fade-in">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);margin-bottom:1rem;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3>No products found</h3>
          <p class="text-muted">Try clearing your search filters or scan a product barcode.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map((p, idx) => {
      let unitText = '1 Unit';
      if (p.name.toLowerCase().includes('milk') || p.name.toLowerCase().includes('juice') || p.name.toLowerCase().includes('oil')) unitText = '1 Litre';
      else if (p.name.toLowerCase().includes('bread')) unitText = '400 g';
      else if (p.name.toLowerCase().includes('rice') || p.name.toLowerCase().includes('atta')) unitText = '5 kg';
      else if (p.name.toLowerCase().includes('butter') || p.name.toLowerCase().includes('cheese')) unitText = '200 g';

      return `
        <div class="product-card animate-fade-in" style="animation-delay: ${idx * 0.04}s;" onclick="productsUI.openDetailModal('${p.id}')">
          <button class="favorite-btn" onclick="event.stopPropagation(); this.classList.toggle('active'); this.classList.add('heart-popped'); setTimeout(() => this.classList.remove('heart-popped'), 350);" aria-label="Add to favorites">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          
          <div class="product-img-wrapper" style="display:flex;align-items:center;justify-content:center;background:var(--surface-container-high, #f1f5f9);border-radius:12px;padding:1.25rem;">
            <div class="product-badge" style="width:48px;height:48px;border-radius:50%;background:rgba(0,108,73,0.12);color:var(--secondary, #006c49);display:flex;align-items:center;justify-content:center;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
          </div>

          <div class="product-details">
            <div>
              <div class="product-title">${p.name}</div>
              <div class="product-unit">${unitText}</div>
            </div>
            <div class="product-price-row">
              <div class="product-price">${utils.formatCurrency(p.price)}</div>
              <button class="product-add-btn" onclick="event.stopPropagation(); cartUI.addToCart('${p.id}', '${p.barcode}', 1, event)" title="Add to Cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterCategory(catId, chipEl) {
    this.activeCategory = catId;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');
    this.loadProducts();
  },

  handleSearch(query) {
    this.searchQuery = query;
    this.loadProducts();
  },

  /* Open Dedicated Product Details Page */
  openDetailModal(productId) {
    window.location.href = `/customer/product.html?id=${productId}`;
  }
};
