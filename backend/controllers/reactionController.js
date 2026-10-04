/* ==========================================================================
   DRAGME BACKEND CONTROLLER: CROWN REACTION & WHO-REACTED SYSTEM (backend/controllers/reactionController.js)
   Server-authoritative controller delegating to reactionService
   ========================================================================== */

const reactionService = require('../services/reactionService');
const { sendError } = require('../utils/responseUtils');

const reactionController = {
  // Reaction Vote / Switch / Super Crown
  async handleVoteOrReact(req, res) {
    const postId = req.params.id;
    const userId = req.user.id;
    const reactionType = req.body?.reactionType;
    const isSuper = Boolean(req.body?.isSuper);
    const remove = req.body?.remove === true;
    const switchOnly = Boolean(req.body?.switchOnly);

    try {
      const result = await reactionService.handleVoteOrReact({
        postId,
        userId,
        reactionType,
        isSuper,
        remove,
        switchOnly
      });
      return res.json(result);
    } catch (err) {
      console.error('Vote/React error:', err.message);
      return sendError(res, err.message || 'Server error processing reaction.', err.statusCode || 500);
    }
  },

  // Get Who Reacted List
  async getWhoReacted(req, res) {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    try {
      const result = await reactionService.getWhoReacted(postId, currentUserId);
      return res.json(result);
    } catch (err) {
      console.error('Fetch reactors error:', err.message);
      return sendError(res, err.message || 'Server error retrieving reactors.', err.statusCode || 500);
    }
  }
};

module.exports = reactionController;
