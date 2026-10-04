/* ==========================================================================
   DRAGME BACKEND ROUTES: POSTS, COMMENTS, REACTIONS & BOOKMARKS
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { postController } = require('../controllers/postController');
const reactionController = require('../controllers/reactionController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

// Feed & Posts
router.get('/posts', optionalAuth, postController.getFeed);
router.post('/posts', requireAuth, rateLimiter({ windowMs: 60000, max: 10 }), postController.createPost);
router.post('/posts/:id/save', requireAuth, postController.savePost);

// Crown Reactions & Reactors
router.post('/posts/:id/vote', requireAuth, reactionController.handleVoteOrReact);
router.post('/posts/:id/react', requireAuth, reactionController.handleVoteOrReact);
router.get('/posts/:id/reactors', optionalAuth, reactionController.getWhoReacted);
router.get('/posts/:id/who-reacted', optionalAuth, reactionController.getWhoReacted);

module.exports = router;
