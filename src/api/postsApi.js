/* ==========================================================================
   DRAGME API: POSTS & FEED (src/api/postsApi.js)
   Feed sorting, post publishing, and bookmark toggling
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const postsApi = {
  async getFeed({ room = 'all', sort = 'hot', search = '', limit = 40, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (room && room !== 'all') params.append('room', room);
    if (sort) params.append('sort', sort);
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    return apiClient.request(`/api/posts?${params.toString()}`);
  },

  async createPost(postData) {
    return apiClient.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  },

  async savePost(postId) {
    return apiClient.request(`/api/posts/${postId}/save`, {
      method: 'POST'
    });
  }
};
