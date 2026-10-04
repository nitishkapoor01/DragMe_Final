/* ==========================================================================
   DRAGME BACKEND CONTROLLER: POSTS & FEED MANAGEMENT (backend/controllers/postController.js)
   Server-authoritative controller delegating to postService
   ========================================================================== */

const postService = require('../services/postService');
const { formatTimeAgo } = require('../utils/timeUtils');
const { sendError } = require('../utils/responseUtils');

const postController = {
  // Get Posts Feed (Hot, Top, New with Filters)
  async getFeed(req, res) {
    const { room, sort = 'hot', search, limit, offset } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    try {
      const posts = await postService.getFeed({
        room,
        sort,
        search,
        limit,
        offset,
        currentUserId
      });
      return res.json({ posts });
    } catch (err) {
      console.error('Fetch posts error:', err);
      return sendError(res, 'Server error fetching posts.', 500);
    }
  },

  // Create New Post
  async createPost(req, res) {
    const { title, content, category, isAnonymous, attachedFile } = req.body;

    try {
      const newPost = await postService.createPost({
        title,
        content,
        category,
        isAnonymous,
        attachedFile,
        user: req.user
      });

      return res.status(201).json({
        message: 'Post published successfully!',
        post: newPost
      });
    } catch (err) {
      console.error('Create post error:', err.message);
      return sendError(res, err.message || 'Server error publishing post.', err.statusCode || 500);
    }
  },

  // Save / Bookmark Post
  async savePost(req, res) {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
      const result = await postService.toggleSave(postId, userId);
      return res.json(result);
    } catch (err) {
      console.error('Save error:', err.message);
      return sendError(res, err.message || 'Server error saving post.', err.statusCode || 500);
    }
  }
};

module.exports = { postController, formatTimeAgo };
