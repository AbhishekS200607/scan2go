/**
 * Scan2Go Centralized API Fetch Wrapper
 */
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
      const json = await response.json();

      if (!response.ok || !json.success) {
        const errorMsg = json.error?.message || 'An error occurred during request.';
        
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
          localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
          if (!window.location.pathname.includes('login.html')) {
            utils.showToast('Session expired. Please log in again.', 'error');
            setTimeout(() => { window.location.href = '/login.html'; }, 1000);
          }
        } else if (response.status === 403) {
          utils.showToast(errorMsg, 'error');
        }

        const err = new Error(errorMsg);
        err.status = response.status;
        err.code = json.error?.code;
        throw err;
      }

      return json.data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
