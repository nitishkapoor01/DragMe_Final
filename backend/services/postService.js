/* ==========================================================================
   DRAGME BACKEND SERVICE: POSTS & FEED (backend/services/postService.js)
   Business logic for feed sorting, post generation, formatting, and bookmarks
   ========================================================================== */

const crypto = require('crypto');
const postRepository = require('../repositories/postRepository');
const commentRepository = require('../repositories/commentRepository');
const mediaRepository = require('../repositories/mediaRepository');
const postValidator = require('../validators/postValidator');
const { formatTimeAgo } = require('../utils/timeUtils');
const MediaService = require('../../services/mediaService');

const postService = {
  async getFeed({ room, sort = 'hot', search, limit = 40, offset = 0, currentUserId = null }) {
    const posts = await postRepository.getFeed({ room, sort, search, limit, offset });

    const formattedPosts = await Promise.all(posts.map(async (post) => {
      let hasVoted = false;
      let reactionType = null;
      let isSuper = false;
      let isSaved = false;

      if (currentUserId) {
        const voteCheck = await postRepository.getUserVote(currentUserId, post.id);
        if (voteCheck) {
          hasVoted = true;
          reactionType = voteCheck.reaction_type || 'crown';
          isSuper = Boolean(voteCheck.is_super);
        }

        isSaved = await postRepository.isSavedByUser(currentUserId, post.id);
      }

      const postComments = await commentRepository.getByPostId(post.id);
      const commentsFormatted = postComments.map(c => ({
        id: c.id,
        author: c.author_username,
        text: c.text,
        timeAgo: formatTimeAgo(c.created_at)
      }));

      return {
        id: post.id,
        title: post.title,
        author: post.author_username,
        avatar: post.author_avatar,
        isAnonymous: Boolean(post.is_anonymous),
        room: post.room,
        roomDisplayName: post.room_display_name,
        timeAgo: formatTimeAgo(post.created_at),
        flair: post.flair,
        flairClass: post.flair_class,
        imageUrl: post.image_url,
        content: post.content,
        dragCount: post.drag_count,
        commentCount: post.comment_count,
        heatPercent: post.heat_percent,
        hasVoted,
        reactionType,
        isSuper,
        isSaved,
        comments: commentsFormatted
      };
    }));

    return formattedPosts;
  },

  async createPost({ title, content, category, isAnonymous, attachedFile, user }) {
    const validation = postValidator.validateCreatePost({ title, content, category, isAnonymous, attachedFile });
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const { title: cleanTitle, content: cleanContent, category: validCategory, room: roomKey, flair, flairClass, isAnonymous: isAnon, attachedFile: cleanAttached } = validation.data;

    const authorId = user.id;
    const authorUsername = isAnon ? 'Masked Persona' : user.username;
    const authorAvatar = isAnon ? '' : (user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`);

    const postId = `post-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const heatPercent = Math.floor(Math.random() * 15) + 85;

    await postRepository.create({
      id: postId,
      authorId,
      authorUsername,
      authorAvatar,
      isAnonymous: isAnon,
      room: roomKey,
      roomDisplayName: validCategory,
      title: cleanTitle,
      content: cleanContent,
      imageUrl: cleanAttached,
      flair,
      flairClass,
      heatPercent
    });

    if (cleanAttached && cleanAttached.startsWith('/uploads/')) {
      try {
        const asset = await mediaRepository.findByStorageUrlOrKey(cleanAttached);
        if (asset) {
          await MediaService.attachMediaUsage(asset.id, 'post_media', postId);
        }
      } catch (mErr) {}
    }

    return {
      id: postId,
      title: cleanTitle,
      author: authorUsername,
      avatar: authorAvatar,
      isAnonymous: isAnon,
      room: roomKey,
      roomDisplayName: validCategory,
      timeAgo: 'Just now',
      flair,
      flairClass,
      imageUrl: cleanAttached,
      content: cleanContent,
      dragCount: 1,
      commentCount: 0,
      heatPercent,
      hasVoted: true,
      isSaved: false,
      comments: []
    };
  },

  async toggleSave(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found.');
      err.statusCode = 404;
      throw err;
    }

    const isSaved = await postRepository.toggleSave(userId, postId);
    return { postId, isSaved };
  }
};

module.exports = postService;
