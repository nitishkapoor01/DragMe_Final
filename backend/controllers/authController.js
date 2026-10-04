/* ==========================================================================
   DRAGME BACKEND CONTROLLER: AUTHENTICATION & USER MANAGEMENT (backend/controllers/authController.js)
   Server-authoritative controller delegating to authService
   ========================================================================== */

const authService = require('../services/authService');
const { sendError } = require('../utils/responseUtils');

const authController = {
  // 1. Check Username Availability
  async checkUsername(req, res) {
    try {
      const result = await authService.checkUsername(req.query.username);
      if (!result.valid && result.error && !result.status) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } catch (err) {
      console.error('Username check error:', err);
      return sendError(res, 'Server error checking username.', err.statusCode || 500);
    }
  },

  // 2. Register New User
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (err) {
      console.error('Registration Error:', err.message);
      return sendError(res, err.message || 'Server error while creating account.', err.statusCode || 500);
    }
  },

  // 3. Login
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return res.json(result);
    } catch (err) {
      console.error('Login Error:', err.message);
      return sendError(res, err.message || 'Server error during login.', err.statusCode || 500);
    }
  },

  // 4. Current User Session
  async getMe(req, res) {
    try {
      if (!req.user) {
        return res.json({ user: null });
      }
      const user = await authService.getSessionUser(req.user.id);
      return res.json({ user: user || req.user });
    } catch (err) {
      console.error('Session Error:', err);
      return sendError(res, 'Server error fetching session.', 500);
    }
  }
};

module.exports = authController;
