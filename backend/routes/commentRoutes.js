/* ==========================================================================
   DRAGME BACKEND ROUTES: COMMENTS
   ========================================================================== */

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/posts/:id/comments', commentController.getComments);
router.post('/posts/:id/comments', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), commentController.addComment);

module.exports = router;
