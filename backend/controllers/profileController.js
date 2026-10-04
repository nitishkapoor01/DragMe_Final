/* ==========================================================================
   DRAGME BACKEND CONTROLLER: PROFILE MANAGEMENT (backend/controllers/profileController.js)
   Server-authoritative controller delegating to profileService
   ========================================================================== */

const profileService = require('../services/profileService');
const { sendError } = require('../utils/responseUtils');

const profileController = {
  // Get User Profile
  async getProfile(req, res) {
    const target = req.params.username.trim();
    try {
      const profile = await profileService.getProfile(target, req.user);
      return res.json({ profile });
    } catch (err) {
      console.error('Fetch profile error:', err.message);
      return sendError(res, err.message || 'Server error retrieving profile.', err.statusCode || 500);
    }
  },

  // Update Profile
  async updateProfile(req, res) {
    const userId = req.user.id;
    try {
      const updatedUser = await profileService.updateProfile(userId, req.body);
      return res.json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (err) {
      console.error('Update profile error:', err.message);
      return sendError(res, err.message || 'Server error updating profile.', err.statusCode || 500);
    }
  }
};

module.exports = profileController;
