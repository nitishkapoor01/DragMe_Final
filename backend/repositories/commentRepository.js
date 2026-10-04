/* ==========================================================================
   DRAGME BACKEND REPOSITORY: COMMENT DATA ACCESS (backend/repositories/commentRepository.js)
   Server-authoritative database operations for comments and discussions
   ========================================================================== */

const db = require('../../db');

const commentRepository = {
  async getByPostId(postId) {
    return await db.all(`
      SELECT id, author_id, author_username, author_avatar, text, created_at
      FROM comments
      WHERE post_id = ?
      ORDER BY created_at ASC
    `, [postId]);
  },

  async create({ id, postId, authorId, authorUsername, authorAvatar = '', text }) {
    await db.run(`
      INSERT INTO comments (id, post_id, author_id, author_username, author_avatar, text)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, postId, authorId, authorUsername, authorAvatar, text]);

    return {
      id,
      postId,
      authorId,
      authorUsername,
      authorAvatar,
      text,
      createdAt: new Date().toISOString()
    };
  }
};

module.exports = commentRepository;
