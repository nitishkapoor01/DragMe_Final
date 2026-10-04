/* ==========================================================================
   DRAGME API: AUTHENTICATION (src/api/authApi.js)
   Login, Registration, Token Invalidation & Username Availability
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const authApi = {
  async checkUsername(username) {
    return apiClient.request(`/api/users/check-username?username=${encodeURIComponent(username)}`, { silent: true });
  },

  async register(data) {
    const res = await apiClient.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      apiClient.setToken(res.token);
    }
    return res;
  },

  async login(credentials) {
    const res = await apiClient.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.token) {
      apiClient.setToken(res.token);
    }
    return res;
  },

  async getSession() {
    return apiClient.request('/api/auth/me', { silent: true });
  },

  async logout() {
    apiClient.setToken(null);
  }
};
