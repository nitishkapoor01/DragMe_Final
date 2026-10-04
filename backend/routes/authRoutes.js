/* ==========================================================================
   DRAGME BACKEND ROUTES: AUTHENTICATION & USERS
   ========================================================================== */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { rateLimiter } = require('../middleware/rateLimiter');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

router.get('/users/check-username', rateLimiter({ windowMs: 60000, max: 60 }), authController.checkUsername);
router.post('/auth/register', rateLimiter({ windowMs: 60000, max: 8 }), authController.register);
router.post('/auth/login', rateLimiter({ windowMs: 60000, max: 15 }), authController.login);
router.get('/auth/me', optionalAuth, authController.getMe);

module.exports = router;
