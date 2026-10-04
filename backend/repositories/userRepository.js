/* ==========================================================================
   DRAGME BACKEND REPOSITORY: USER DATA ACCESS (backend/repositories/userRepository.js)
   Server-authoritative database operations for users and credentials
   ========================================================================== */

const db = require('../../db');

const userRepository = {
  async findById(id) {
    return await db.get(`
      SELECT id, username, email, display_name, bio, location, date_of_birth, gender, social_links, visibility,
             avatar_url, banner_url, avatar_frame, avatar_shape, profile_theme, profile_accent,
             profile_badge, profile_effects, is_premium, badges_owned, rank_title, 
             reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
             next_level_points, followers_count, following_count, reactions_count, role, is_banned, created_at, updated_at
      FROM users WHERE id = ?
    `, [id]);
  },

  async findByUsername(username) {
    return await db.get(`
      SELECT id, username, email, display_name, bio, location, date_of_birth, gender, social_links, visibility,
             avatar_url, banner_url, avatar_frame, avatar_shape, profile_theme, profile_accent,
             profile_badge, profile_effects, is_premium, badges_owned, rank_title, 
             reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
             next_level_points, followers_count, following_count, reactions_count, role, is_banned, created_at, updated_at
      FROM users WHERE LOWER(username) = LOWER(?)
    `, [username]);
  },

  async findByUsernameOrEmail(identifier) {
    return await db.get(`
      SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `, [identifier, identifier.toLowerCase()]);
  },

  async findByUsernameOrEmailExact(username, email) {
    return await db.get(`
      SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `, [username, email]);
  },

  async createUser(userData) {
    const { id, username, email, passwordHash, avatarUrl, role = 'user' } = userData;
    await db.run(`
      INSERT INTO users (id, username, email, password_hash, avatar_url, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, username, email, passwordHash, avatarUrl, role]);
    return await this.findById(id);
  },

  async updateProfile(id, fields) {
    const {
      displayName,
      bio,
      location,
      dateOfBirth,
      gender,
      socialLinks,
      visibility,
      avatarUrl,
      bannerUrl,
      avatarFrame,
      avatarShape,
      profileTheme,
      profileAccent,
      profileBadge,
      profileEffects
    } = fields;

    await db.run(`
      UPDATE users
      SET display_name = ?, bio = ?, location = ?, date_of_birth = ?, gender = ?,
          social_links = ?, visibility = ?, avatar_url = ?, banner_url = ?,
          avatar_frame = ?, avatar_shape = ?, profile_theme = ?, profile_accent = ?,
          profile_badge = ?, profile_effects = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      displayName, bio, location, dateOfBirth, gender,
      socialLinks, visibility, avatarUrl, bannerUrl,
      avatarFrame || 'none', avatarShape || 'rectangular', profileTheme || 'default',
      profileAccent || 'lime', profileBadge || 'senior_roaster', profileEffects || 'none',
      id
    ]);

    return await this.findById(id);
  },

  async getCountsForUser(username) {
    const postCountRow = await db.get('SELECT COUNT(*) as count FROM posts WHERE LOWER(author_username) = LOWER(?)', [username]);
    const confessionCountRow = await db.get("SELECT COUNT(*) as count FROM posts WHERE LOWER(author_username) = LOWER(?) AND (is_anonymous = 1 OR LOWER(room) = 'confessions')", [username]);
    const reactionsRow = await db.get('SELECT COALESCE(SUM(drag_count), 0) as total FROM posts WHERE LOWER(author_username) = LOWER(?)', [username]);

    return {
      posts: parseInt(postCountRow?.count || 0),
      confessions: parseInt(confessionCountRow?.count || 0),
      reactions: parseInt(reactionsRow?.total || 0)
    };
  }
};

module.exports = userRepository;
