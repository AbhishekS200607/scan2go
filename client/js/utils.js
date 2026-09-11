/**
 * Scan2Go UI Utilities & Motion Animation Helpers
 */
const utils = {
  formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '₹' + num.toFixed(2);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fade-in`;
    toast.innerHTML = `
      <span>${message}</span>
      <span style="cursor:pointer;margin-left:12px;display:flex;align-items:center;" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5 pitch
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 150);
    } catch (e) {
      console.log('Audio feedback un-played');
    }
  },

  /**
   * Smooth Fly-to-Cart Particle Animation
   */
  animateFlyToCart(sourceEl) {
    if (!sourceEl) return;

    const cardEl = sourceEl.closest('.product-card') || sourceEl.closest('.modal-content-sheet') || sourceEl.parentElement;
    const badgeEl = cardEl ? (cardEl.querySelector('.product-badge') || cardEl.querySelector('.product-badge-container')) : null;
    const targetCart = document.querySelector('.cart-count') || document.querySelector('.scan-fab');

    if (!targetCart) return;

    const startRect = badgeEl ? badgeEl.getBoundingClientRect() : sourceEl.getBoundingClientRect();
    const targetRect = targetCart.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    flyer.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006c49" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
    flyer.style.top = `${startRect.top + startRect.height / 2 - 15}px`;
    flyer.style.left = `${startRect.left + startRect.width / 2 - 15}px`;
    flyer.style.position = 'fixed';
    flyer.style.zIndex = '9999';
    flyer.style.pointerEvents = 'none';
    flyer.style.transition = 'all 0.6s cubic-bezier(0.2, 1, 0.3, 1)';
    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      flyer.style.top = `${targetRect.top + targetRect.height / 2 - 15}px`;
      flyer.style.left = `${targetRect.left + targetRect.width / 2 - 15}px`;
      flyer.style.width = '18px';
      flyer.style.height = '18px';
      flyer.style.opacity = '0.2';
    });

    setTimeout(() => {
      flyer.remove();
      const cartCountEls = document.querySelectorAll('.cart-count');
      cartCountEls.forEach(el => {
        el.classList.add('scale-125');
        setTimeout(() => el.classList.remove('scale-125'), 250);
      });
    }, 700);
  }
};
