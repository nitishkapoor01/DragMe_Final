/* ==========================================================================
   DRAGME API: PROFILES (src/api/profilesApi.js)
   Profile retrieval, stats, badges, and customization updates
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const profilesApi = {
  async getProfile(username) {
    return apiClient.request(`/api/users/${encodeURIComponent(username)}/profile`);
  },

  async updateProfile(profileData) {
    return apiClient.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }
};
