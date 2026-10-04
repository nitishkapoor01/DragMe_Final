/* ==========================================================================
   DRAGME CORE: UNIFIED API CLIENT SERVICE (src/api/apiClient.js)
   Server-Authoritative, JWT-managed, Rate-limit & Error Handling
   ========================================================================== */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.tokenKey = 'dragme_jwt_token';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || localStorage.getItem('dragme_auth_token') || '';
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem('dragme_auth_token', token);
    } else {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('dragme_auth_token');
    }
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const isFormData = options.isFormData || options.body instanceof FormData;
    
    const headers = isFormData
      ? (this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}`, ...(options.headers || {}) } : { ...(options.headers || {}) })
      : this.getHeaders(options.headers);

    let body = options.body;
    if (body && typeof body === 'object' && !isFormData) {
      body = JSON.stringify(body);
    }

    const config = {
      ...options,
      body,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || data.message || `HTTP Error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (!options.silent) {
        console.error(`[API Error] ${endpoint}:`, err.message);
      }
      throw err;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
