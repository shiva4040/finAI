const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    try {
      return localStorage.getItem('finai_token');
    } catch {
      return null;
    }
  }

  getRefreshToken() {
    try {
      return localStorage.getItem('finai_refresh_token');
    } catch {
      return null;
    }
  }

  setTokens(accessToken, refreshToken) {
    try {
      if (accessToken) localStorage.setItem('finai_token', accessToken);
      if (refreshToken) localStorage.setItem('finai_refresh_token', refreshToken);
    } catch (e) {
      console.error('Error saving tokens', e);
    }
  }

  clearTokens() {
    try {
      localStorage.removeItem('finai_token');
      localStorage.removeItem('finai_refresh_token');
      localStorage.removeItem('finai_auth_user');
    } catch (e) {
      console.error('Error clearing tokens', e);
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    let response = await fetch(url, config);

    // Auto token refresh if 401 and refresh token exists
    if (response.status === 401 && this.getRefreshToken() && !endpoint.includes('/auth/')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch {
        errData = { message: response.statusText };
      }
      const error = new Error(errData?.error?.message || errData?.detail || 'API request failed');
      error.status = response.status;
      error.details = errData?.error?.details || {};
      throw error;
    }

    // Return blob if response is PDF or CSV
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
      return await response.blob();
    }

    return await response.json();
  }

  async refreshToken() {
    try {
      const refresh = this.getRefreshToken();
      if (!refresh) return false;
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
      this.clearTokens();
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async download(endpoint, defaultFilename = 'download') {
    const blob = await this.get(endpoint);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const apiClient = new ApiClient();
