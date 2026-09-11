/**
 * Scan2Go — UI Notification Center & Slide-Over Drawer
 */
const notificationsUI = {
  STORAGE_KEY: 'scan2go_notifications',

  init() {
    this.ensureDrawerDOM();
    this.bindEvents();
    this.updateBadges();
  },

  getNotifications() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse notifications:', e);
    }
    return [];
  },

  saveNotifications(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    this.updateBadges();
    this.renderList();
  },

  addNotification({ title, message, type = 'system' }) {
    const list = this.getNotifications();
    const newNotif = {
      id: 'notif-' + Date.now(),
      title,
      message,
      time: new Date().toISOString(),
      type,
      read: false
    };
    list.unshift(newNotif);
    this.saveNotifications(list);

    // Show instant toast notification
    if (window.utils && utils.showToast) {
      utils.showToast(`${title}: ${message}`, type === 'order' ? 'success' : 'info');
    }
  },

  getUnreadCount() {
    const list = this.getNotifications();
    return list.filter(n => !n.read).length;
  },

  updateBadges() {
    const unread = this.getUnreadCount();
    const dots = document.querySelectorAll('.notification-dot, [aria-label="Notifications"] span');
    dots.forEach(dot => {
      if (unread > 0) {
        dot.style.display = 'block';
      } else {
        dot.style.display = 'none';
      }
    });

    const badgeCounts = document.querySelectorAll('.notification-unread-count');
    badgeCounts.forEach(bc => {
      bc.textContent = unread;
      bc.style.display = unread > 0 ? 'inline-flex' : 'none';
    });
  },

  ensureDrawerDOM() {
    if (document.getElementById('notification-drawer')) return;

    const drawerHTML = `
      <div id="notification-drawer-overlay" class="notif-overlay" onclick="notificationsUI.closeDrawer()"></div>
      <div id="notification-drawer" class="notif-drawer">
        <div class="notif-header flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="notif-header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-main, #141b2b);">Notifications</h3>
              <span class="text-xs text-muted" style="font-size:0.75rem;color:#6b7280;">Updates & Store Alerts</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="notificationsUI.markAllAsRead()" class="notif-action-btn" title="Mark all as read">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button onclick="notificationsUI.closeDrawer()" class="notif-close-btn" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="notif-tabs flex gap-2">
          <button onclick="notificationsUI.setFilter('all')" class="notif-tab active" id="notif-tab-all">All</button>
          <button onclick="notificationsUI.setFilter('unread')" class="notif-tab" id="notif-tab-unread">Unread</button>
          <button onclick="notificationsUI.setFilter('order')" class="notif-tab" id="notif-tab-order">Orders</button>
          <button onclick="notificationsUI.setFilter('offer')" class="notif-tab" id="notif-tab-offer">Offers</button>
        </div>

        <div class="notif-body" id="notif-list-container">
          <!-- Loaded dynamically -->
        </div>

        <div class="notif-footer flex items-center justify-between">
          <span style="font-size:0.75rem;color:#6b7280;display:flex;align-items:center;gap:4px;">
            <span style="width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block;"></span>
            Gate Scanner Active
          </span>
          <button onclick="notificationsUI.clearAll()" style="font-size:0.75rem;color:#ef4444;background:none;border:none;cursor:pointer;font-weight:600;">Clear All</button>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = drawerHTML;
    document.body.appendChild(wrapper);

    this.injectStyles();
  },

  injectStyles() {
    if (document.getElementById('notif-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      .notif-overlay {
        position: fixed;
        inset: 0;
        background: rgba(13, 59, 46, 0.4);
        backdrop-filter: blur(4px);
        z-index: 9998;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      .notif-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      .notif-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        max-width: 400px;
        background: #ffffff;
        z-index: 9999;
        box-shadow: -4px 0 24px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .notif-drawer.active {
        transform: translateX(0);
      }
      .notif-header {
        padding: 1.1rem 1.2rem;
        border-bottom: 1px solid #f0f2f5;
        background: #fdfdfd;
      }
      .notif-header-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: #e6f4f0;
        color: #0d3b2e;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .notif-action-btn, .notif-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: #f4f6f8;
        color: #4b5563;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
      }
      .notif-action-btn:hover, .notif-close-btn:hover {
        background: #e5e7eb;
        color: #111827;
      }
      .notif-tabs {
        padding: 0.8rem 1.2rem;
        border-bottom: 1px solid #f0f2f5;
        background: #ffffff;
      }
      .notif-tab {
        padding: 0.4rem 0.8rem;
        border-radius: 20px;
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        font-size: 0.78rem;
        font-weight: 600;
        color: #4b5563;
        cursor: pointer;
        transition: all 0.2s;
      }
      .notif-tab.active {
        background: #0d3b2e;
        color: #ffffff;
        border-color: #0d3b2e;
      }
      .notif-body {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .notif-card {
        padding: 0.9rem;
        border-radius: 14px;
        border: 1px solid #f0f2f5;
        background: #ffffff;
        display: flex;
        gap: 0.75rem;
        position: relative;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      }
      .notif-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        border-color: #d1d5db;
      }
      .notif-card.unread {
        background: #f4fbf8;
        border-color: #c4ecd0;
      }
      .notif-icon-box {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .notif-type-order { background: #dcfce7; color: #15803d; }
      .notif-type-offer { background: #fef3c7; color: #b45309; }
      .notif-type-system { background: #e0f2fe; color: #0369a1; }
      .notif-card-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 0.2rem;
      }
      .notif-card-desc {
        font-size: 0.78rem;
        color: #4b5563;
        line-height: 1.35;
      }
      .notif-card-time {
        font-size: 0.7rem;
        color: #9ca3af;
        margin-top: 0.35rem;
      }
      .notif-unread-indicator {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
      }
      .notif-footer {
        padding: 0.9rem 1.2rem;
        border-top: 1px solid #f0f2f5;
        background: #fdfdfd;
      }
      .notif-empty {
        text-align: center;
        padding: 3rem 1rem;
        color: #9ca3af;
      }
      .notif-empty svg {
        margin: 0 auto 0.75rem auto;
        color: #d1d5db;
      }
    `;
    document.head.appendChild(style);
  },

  bindEvents() {
    // Bind all bell buttons across the page
    document.addEventListener('click', (e) => {
      const bellBtn = e.target.closest('[aria-label="Notifications"], .notification-bell');
      if (bellBtn) {
        e.preventDefault();
        this.openDrawer();
      }
    });
  },

  currentFilter: 'all',

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`notif-tab-${filter}`);
    if (activeTab) activeTab.classList.add('active');
    this.renderList();
  },

  openDrawer() {
    this.ensureDrawerDOM();
    this.renderList();
    document.getElementById('notification-drawer-overlay').classList.add('active');
    document.getElementById('notification-drawer').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    const overlay = document.getElementById('notification-drawer-overlay');
    const drawer = document.getElementById('notification-drawer');
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
  },

  toggleDrawer() {
    const drawer = document.getElementById('notification-drawer');
    if (drawer && drawer.classList.contains('active')) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  },

  markAsRead(id) {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      this.saveNotifications(list);
    }
  },

  markAllAsRead() {
    const list = this.getNotifications();
    list.forEach(n => n.read = true);
    this.saveNotifications(list);
  },

  clearAll() {
    this.saveNotifications([]);
  },

  formatTime(isoString) {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  },

  renderList() {
    const container = document.getElementById('notif-list-container');
    if (!container) return;

    let list = this.getNotifications();

    if (this.currentFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (this.currentFilter === 'order') {
      list = list.filter(n => n.type === 'order');
    } else if (this.currentFilter === 'offer') {
      list = list.filter(n => n.type === 'offer');
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="notif-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <p style="font-size:0.85rem;font-weight:600;margin:0;">No notifications found</p>
          <span style="font-size:0.75rem;">You are all caught up with your store updates!</span>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      let icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      let typeClass = 'notif-type-system';

      if (item.type === 'order') {
        typeClass = 'notif-type-order';
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else if (item.type === 'offer') {
        typeClass = 'notif-type-offer';
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
      }

      return `
        <div class="notif-card ${item.read ? '' : 'unread'}" onclick="notificationsUI.markAsRead('${item.id}')">
          <div class="notif-icon-box ${typeClass}">
            ${icon}
          </div>
          <div style="flex:1;">
            <div class="notif-card-title">${item.title}</div>
            <div class="notif-card-desc">${item.message}</div>
            <div class="notif-card-time">${this.formatTime(item.time)}</div>
          </div>
          ${!item.read ? '<div class="notif-unread-indicator"></div>' : ''}
        </div>
      `;
    }).join('');
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => notificationsUI.init());
