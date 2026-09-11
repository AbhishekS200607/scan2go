/**
 * Scan2Go Authentication & Authorization Manager
 */
const auth = {
  getUser() {
    const raw = localStorage.getItem(CONFIG.USER_STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken() && this.getUser());
  },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    if (data.token && data.user) {
      localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(data.user));
      utils.showToast(`Welcome back, ${data.user.full_name}!`, 'success');
      this.redirectByRole(data.user.role);
    }
    return data;
  },

  async register(full_name, email, password, phone, role = 'customer') {
    const data = await api.post('/auth/register', { full_name, email, password, phone, role });
    if (data.token && data.user) {
      localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(data.user));
      utils.showToast('Account registered successfully!', 'success');
      this.redirectByRole(data.user.role);
    }
    return data;
  },

  logout() {
    localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
    utils.showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 500);
  },

  redirectByRole(role) {
    setTimeout(() => {
      if (role === 'admin') {
        window.location.href = '/admin/dashboard.html';
      } else if (role === 'security') {
        window.location.href = '/security/dashboard.html';
      } else {
        window.location.href = '/customer/dashboard.html';
      }
    }, 600);
  },

  protectPage(...requiredRoles) {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }

    const user = this.getUser();
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      utils.showToast('Access denied for your user role.', 'error');
      this.redirectByRole(user.role);
      return false;
    }

    return true;
  }
};
