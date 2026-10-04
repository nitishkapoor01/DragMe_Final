/* ==========================================================================
   DRAGME BACKEND VALIDATOR: AUTHENTICATION (backend/validators/authValidator.js)
   Server-side validation and sanitization for registration, login, usernames
   ========================================================================== */

const RESERVED_USERNAMES = [
  'admin', 'moderator', 'dragme', 'root', 'api', 'system', 'support',
  'anonymous', 'owner', 'staff', 'help', 'official', 'bot'
];

const authValidator = {
  validateUsername(rawUsername) {
    if (!rawUsername || typeof rawUsername !== 'string') {
      return { valid: false, error: 'Username parameter is required.' };
    }

    const username = rawUsername.trim();

    if (username.length < 4 || username.length > 20) {
      return { available: false, valid: false, status: 'invalid', error: 'Username must be between 4 and 20 characters long.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { available: false, valid: false, status: 'invalid', error: 'Username can only contain letters, numbers, and underscores.' };
    }
    if (username.startsWith('_') || username.endsWith('_')) {
      return { available: false, valid: false, status: 'invalid', error: 'Username cannot start or end with an underscore.' };
    }

    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return { available: false, valid: false, status: 'taken', error: `@${username} is reserved by the platform.` };
    }

    return { valid: true, username };
  },

  validateRegistration({ username, email, password }) {
    if (!username || !email || !password) {
      return { valid: false, error: 'Username, email, and password are required.' };
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      return { valid: false, error: 'Username must be 3-25 characters long.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { valid: false, error: 'Invalid email address format.' };
    }
    if (password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters long.' };
    }

    return {
      valid: true,
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: String(password)
      }
    };
  },

  validateLogin({ login, identifier, username, email, password }) {
    const rawLogin = login || identifier || username || email;
    if (!rawLogin || !password) {
      return { valid: false, error: 'Please enter your username/email and password.' };
    }

    return {
      valid: true,
      login: String(rawLogin).trim(),
      password: String(password)
    };
  }
};

module.exports = authValidator;
