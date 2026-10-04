/* ==========================================================================
   DRAGME API: REACTIONS & CROWNS (src/api/reactionsApi.js)
   Standard Crown, Super Crown, Reaction Switching, and Reactor Lists
   ========================================================================== */

import { apiClient } from './apiClient.js';

export const reactionsApi = {
  async reactToPost(postId, { reactionType = 'crown', isSuper = false, remove = false, switchOnly = false } = {}) {
    return apiClient.request(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ reactionType, isSuper, remove, switchOnly })
    });
  },

  async getWhoReacted(postId) {
    return apiClient.request(`/api/posts/${postId}/who-reacted`);
  }
};
