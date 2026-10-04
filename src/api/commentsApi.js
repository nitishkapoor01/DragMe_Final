/* ==========================================================================
   DRAGME API: COMMENTS (src/api/commentsApi.js)
   Comment addition and discussion retrieval
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const commentsApi = {
  async getComments(postId) {
    return apiClient.request(`/api/posts/${postId}/comments`);
  },

  async addComment(postId, text) {
    return apiClient.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }
};
