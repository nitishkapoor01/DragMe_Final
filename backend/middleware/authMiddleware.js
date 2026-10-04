/* ==========================================================================
   DRAGME BACKEND MIDDLEWARE: AUTHENTICATION & AUTHORIZATION
   ========================================================================== */

const jwt = require('jsonwebtoken');
const db = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026_dragme_production';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT id, username, email, avatar_url, role, is_banned, is_premium FROM users WHERE id = ?', [decoded.id]);
    req.user = (user && !user.is_banned) ? user : null;
  } catch (err) {
    req.user = null;
  }
  next();
}

async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    if (req.user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  optionalAuth,
  requireAuth,
  requireAdmin
};
