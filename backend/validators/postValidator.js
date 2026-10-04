/* ==========================================================================
   DRAGME BACKEND VALIDATOR: POSTS (backend/validators/postValidator.js)
   Server-side validation and sanitization for feed posts and creation
   ========================================================================== */

const ALLOWED_CATEGORIES = [
  'General', 'Roast', 'Confession', 'Discussion', 'Hot Take',
  'Meme', 'Question', 'Tech/AI', 'Flex'
];

const postValidator = {
  validateCreatePost({ title, content, category, isAnonymous, attachedFile }) {
    if (!content || typeof content !== 'string' || !content.trim()) {
      return { valid: false, error: 'Post content cannot be empty.' };
    }

    const cleanContent = content.trim().slice(0, 5000);
    const cleanTitle = title && typeof title === 'string' && title.trim()
      ? title.trim().slice(0, 150)
      : (cleanContent.length > 70 ? cleanContent.substring(0, 70) + '...' : cleanContent);

    const validCategory = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === String(category || '').toLowerCase()) || 'General';
    const roomKey = validCategory.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let flairClass = 'flair-blue';
    const tagUpper = validCategory.toUpperCase();
    if (tagUpper.includes('ROAST')) flairClass = 'flair-roast';
    if (tagUpper.includes('CONFESSION') || Boolean(isAnonymous)) flairClass = 'flair-confession';
    if (tagUpper.includes('DISCUSS')) flairClass = 'flair-discuss';
    if (tagUpper.includes('HOT')) flairClass = 'flair-orange';

    let cleanAttached = null;
    if (attachedFile && typeof attachedFile === 'string') {
      const trimmed = attachedFile.trim();
      if (trimmed.startsWith('/uploads/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        cleanAttached = trimmed;
      }
    }

    return {
      valid: true,
      data: {
        title: cleanTitle,
        content: cleanContent,
        category: validCategory,
        room: roomKey,
        flair: validCategory,
        flairClass,
        isAnonymous: Boolean(isAnonymous),
        attachedFile: cleanAttached
      }
    };
  }
};

module.exports = postValidator;
