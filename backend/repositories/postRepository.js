/* ==========================================================================
   DRAGME BACKEND REPOSITORY: POST DATA ACCESS (backend/repositories/postRepository.js)
   Server-authoritative database operations for posts, feed querying and saves
   ========================================================================== */

const db = require('../../db');

const postRepository = {
  async getFeed({ room, sort = 'hot', search, limit = 40, offset = 0 }) {
    let query = 'SELECT * FROM posts';
    const params = [];
    const conditions = [];

    if (room && room !== 'all') {
      conditions.push('room = ?');
      params.push(room);
    }

    if (search && search.trim()) {
      conditions.push('(title LIKE ? OR content LIKE ? OR author_username LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (sort === 'new') {
      query += ' ORDER BY created_at DESC';
    } else if (sort === 'top') {
      query += ' ORDER BY drag_count DESC, created_at DESC';
    } else {
      query += ' ORDER BY heat_percent DESC, drag_count DESC, created_at DESC';
    }

    const limitNum = Math.min(Math.max(1, parseInt(limit) || 40), 100);
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    return await db.all(query, params);
  },

  async findById(id) {
    return await db.get('SELECT * FROM posts WHERE id = ?', [id]);
  },

  async create(postData) {
    const {
      id, authorId, authorUsername, authorAvatar, isAnonymous,
      room, roomDisplayName, title, content, imageUrl,
      flair, flairClass, heatPercent = 85
    } = postData;

    await db.run(`
      INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
    `, [
      id, authorId, authorUsername, authorAvatar,
      isAnonymous ? 1 : 0, room, roomDisplayName,
      title, content, imageUrl || null,
      flair, flairClass, heatPercent
    ]);

    return await this.findById(id);
  },

  async updateCounts(id, { dragCount, heatPercent, commentCount }) {
    const updates = [];
    const params = [];

    if (dragCount !== undefined) {
      updates.push('drag_count = ?');
      params.push(dragCount);
    }
    if (heatPercent !== undefined) {
      updates.push('heat_percent = ?');
      params.push(heatPercent);
    }
    if (commentCount !== undefined) {
      updates.push('comment_count = ?');
      params.push(commentCount);
    }

    if (updates.length > 0) {
      params.push(id);
      await db.run(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return await this.findById(id);
  },

  async isSavedByUser(userId, postId) {
    const row = await db.get('SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
    return Boolean(row);
  },

  async toggleSave(userId, postId) {
    const existing = await this.isSavedByUser(userId, postId);
    if (existing) {
      await db.run('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
      return false;
    } else {
      await db.run('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      return true;
    }
  },

  async getUserVote(userId, postId) {
    return await db.get('SELECT reaction_type, is_super FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
  }
};

module.exports = postRepository;
