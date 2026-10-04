/* ==========================================================================
   DRAGME API: ROOMS (src/api/roomsApi.js)
   Active rooms discovery and room joins
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const roomsApi = {
  async getActiveRooms() {
    return apiClient.request('/api/rooms/active');
  },

  async joinRoom(roomId) {
    return apiClient.request(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST'
    });
  },

  async createRoom({ name, tag, desc }) {
    return apiClient.request('/api/rooms', {
      method: 'POST',
      body: { name, tag, desc }
    });
  }
};
