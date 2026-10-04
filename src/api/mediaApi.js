/* ==========================================================================
   DRAGME API: MEDIA (src/api/mediaApi.js)
   Media uploads, limits retrieval, metrics, and asset deletion
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const mediaApi = {
  async getLimits() {
    return apiClient.request('/api/media/limits');
  },

  async getMetrics() {
    return apiClient.request('/api/media/metrics');
  },

  async uploadMedia({ data, filename, type = 'avatar', async = false, entityType = null, entityId = null }) {
    return apiClient.request('/api/upload/media', {
      method: 'POST',
      body: JSON.stringify({
        data,
        filename,
        type,
        async,
        entityType,
        entityId
      })
    });
  },

  async deleteAsset(assetId) {
    return apiClient.request(`/api/media/assets/${assetId}`, {
      method: 'DELETE'
    });
  }
};
