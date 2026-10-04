/* ==========================================================================
   DRAGME BACKEND CONTROLLER: COMMENTS & REPLIES (backend/controllers/commentController.js)
   Server-authoritative controller delegating to commentService
   ========================================================================== */

const commentService = require('../services/commentService');
const { sendError } = require('../utils/responseUtils');

const commentController = {
  // Add Comment to Post
  async addComment(req, res) {
    const postId = req.params.id;
    const { text } = req.body;

    try {
      const result = await commentService.addComment({
        postId,
        text,
        user: req.user
      });

      return res.status(201).json({
        message: 'Comment posted!',
        ...result
      });
    } catch (err) {
      console.error('Comment error:', err.message);
      return sendError(res, err.message || 'Server error posting comment.', err.statusCode || 500);
    }
  },

  // Get Comments for Post
  async getComments(req, res) {
    const postId = req.params.id;
    try {
      const comments = await commentService.getComments(postId);
      return res.status(200).json({ comments });
    } catch (err) {
      console.error('Get comments error:', err.message);
      return sendError(res, err.message || 'Server error fetching comments.', err.statusCode || 500);
    }
  }
};

module.exports = commentController;
