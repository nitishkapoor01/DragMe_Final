/* ==========================================================================
   DRAGME BACKEND SERVICE: AUTHENTICATION & SESSION (backend/services/authService.js)
   Business logic for registration, authentication, token issuance, and password security
   ========================================================================== */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const authValidator = require('../validators/authValidator');
const { generateToken } = require('../middleware/authMiddleware');

const authService = {
  async checkUsername(rawUsername) {
    const validation = authValidator.validateUsername(rawUsername);
    if (!validation.valid) {
      return validation;
    }

    const existing = await userRepository.findByUsername(validation.username);
    if (existing) {
      return {
        available: false,
        status: 'taken',
        error: `@${validation.username} is already taken. Try another.`
      };
    }

    return {
      available: true,
      status: 'available',
      username: validation.username,
      message: `${validation.username} is available!`
    };
  },

  async register({ username, email, password }) {
    const validation = authValidator.validateRegistration({ username, email, password });
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const { username: cleanUsername, email: cleanEmail, password: cleanPassword } = validation.data;

    const existing = await userRepository.findByUsernameOrEmailExact(cleanUsername, cleanEmail);
    if (existing) {
      const err = new Error('Username or email is already registered.');
      err.statusCode = 409;
      throw err;
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = bcrypt.hashSync(cleanPassword, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = await userRepository.createUser({
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      avatarUrl: defaultAvatar,
      role: 'user'
    });

    const token = generateToken(newUser);
    const fullNewUser = await userRepository.findById(newUser.id);

    return {
      message: 'Account created successfully!',
      token,
      user: fullNewUser || {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar_url: newUser.avatar_url,
        role: newUser.role
      }
    };
  },

  async login({ login, identifier, password }) {
    const validation = authValidator.validateLogin({ login, identifier, password });
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      throw err;
    }

    const user = await userRepository.findByUsernameOrEmail(validation.login);
    if (!user || !bcrypt.compareSync(validation.password, user.password_hash)) {
      const err = new Error('Invalid username/email or password.');
      err.statusCode = 401;
      throw err;
    }

    if (user.is_banned) {
      const err = new Error('Your account is suspended.');
      err.statusCode = 403;
      throw err;
    }

    const token = generateToken(user);
    const fullUser = await userRepository.findById(user.id);

    return {
      message: 'Login successful!',
      token,
      user: fullUser || {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
      }
    };
  },

  async getSessionUser(userId) {
    if (!userId) return null;
    return await userRepository.findById(userId);
  }
};

module.exports = authService;
