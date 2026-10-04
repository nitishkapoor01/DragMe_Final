/* ==========================================================================
   DRAGME BACKEND REPOSITORY: REACTION & VOTE DATA ACCESS (backend/repositories/reactionRepository.js)
   Server-authoritative database operations for Crown & Super Crown reactions
   ========================================================================== */

const db = require('../../db');

const reactionRepository = {
  async getVote(userId, postId) {
    return await db.get('SELECT reaction_type, is_super, created_at FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
  },

  async createVote({ userId, postId, reactionType = 'crown', isSuper = false }) {
    return await db.run(`
      INSERT INTO votes (user_id, post_id, reaction_type, is_super)
      VALUES (?, ?, ?, ?)
    `, [userId, postId, reactionType, isSuper ? 1 : 0]);
  },

  async updateVote({ userId, postId, reactionType, isSuper }) {
    return await db.run(`
      UPDATE votes
      SET reaction_type = ?, is_super = ?
      WHERE user_id = ? AND post_id = ?
    `, [reactionType, isSuper ? 1 : 0, userId, postId]);
  },

  async deleteVote(userId, postId) {
    return await db.run('DELETE FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
  },

  async getReactorsForPost(postId) {
    return await db.all(`
      SELECT v.user_id, v.reaction_type, v.is_super, v.created_at,
             u.username, u.display_name, u.avatar_url, u.is_premium, u.rank_title, u.reputation_score
      FROM votes v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.post_id = ?
      ORDER BY v.is_super DESC, v.created_at DESC
    `, [postId]);
  }
};

module.exports = reactionRepository;
