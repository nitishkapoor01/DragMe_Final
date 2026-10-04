/* ==========================================================================
   DRAGME BACKEND ROUTES: ROOMS (backend/routes/roomRoutes.js)
   ========================================================================== */

const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');
const { requireAuth } = require('../middleware/authMiddleware');
const { rateLimiter } = require('../middleware/rateLimiter');
const { sendError } = require('../utils/responseUtils');

router.get('/rooms/active', (req, res) => {
  const rooms = roomService.getActiveRooms();
  res.json({ success: true, rooms });
});

router.post('/rooms', requireAuth, rateLimiter({ windowMs: 60000, max: 10 }), (req, res) => {
  try {
    const { name, tag, desc } = req.body;
    const room = roomService.createRoom({ name, tag, desc, user: req.user });
    return res.status(201).json({ success: true, message: `Room ${room.name} created!`, room });
  } catch (err) {
    return sendError(res, err.message || 'Failed to create room.', err.statusCode || 500);
  }
});

router.post('/rooms/:id/join', (req, res) => {
  const room = roomService.getRoomById(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  res.json({ success: true, message: `Joined room ${room.name}`, room });
});

module.exports = router;
