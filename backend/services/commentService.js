/* ==========================================================================
   DRAGME BACKEND SERVICE: COMMENTS (backend/services/commentService.js)
   Business logic for post comments and discussion threads
   ========================================================================== */

const postRepository = require('../repositories/postRepository');
const commentRepository = require('../repositories/commentRepository');
const commentValidator = require('../validators/commentValidator');

const commentService = {
  async addComment({ postId, text, user }) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found.');
      err.statusCode = 404;
      throw err;
    }

    const validation = commentValidator.validateComment({ text });
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const commentId = `c-${Date.now()}`;
    const authorId = user ? user.id : 'guest_commenter';
    const authorUsername = user ? user.username : 'Anonymous Contributor';
    const authorAvatar = user?.avatar_url || '';

    await commentRepository.create({
      id: commentId,
      postId,
      authorId,
      authorUsername,
      authorAvatar,
      text: validation.text
    });

    const newCommentCount = post.comment_count + 1;
    const newHeat = Math.min(100, post.heat_percent + 3);

    await postRepository.updateCounts(postId, {
      commentCount: newCommentCount,
      heatPercent: newHeat
    });

    return {
      comment: {
        id: commentId,
        author: authorUsername,
        text: validation.text,
        timeAgo: 'Just now'
      },
      commentCount: newCommentCount
    };
  },

  async getComments(postId) {
    const comments = await commentRepository.getByPostId(postId);
    return comments.map(c => ({
      id: c.id,
      author: c.author_username,
      authorAvatar: c.author_avatar,
      text: c.text,
      createdAt: c.created_at,
      timeAgo: 'Recently'
    }));
  }
};

module.exports = commentService;
