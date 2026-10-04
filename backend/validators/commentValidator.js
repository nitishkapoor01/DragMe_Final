/* ==========================================================================
   DRAGME BACKEND VALIDATOR: COMMENTS (backend/validators/commentValidator.js)
   Server-side validation for comments and discussions
   ========================================================================== */

const commentValidator = {
  validateComment({ text }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { valid: false, error: 'Comment cannot be empty.' };
    }

    const cleanText = text.trim().slice(0, 1000);
    return {
      valid: true,
      text: cleanText
    };
  }
};

module.exports = commentValidator;
