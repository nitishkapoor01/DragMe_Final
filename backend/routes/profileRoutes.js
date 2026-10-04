/* ==========================================================================
   DRAGME BACKEND ROUTES: PROFILE
   ========================================================================== */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

router.get('/users/:username/profile', optionalAuth, profileController.getProfile);
router.put('/users/profile', requireAuth, rateLimiter({ windowMs: 60000, max: 30 }), profileController.updateProfile);

module.exports = router;
