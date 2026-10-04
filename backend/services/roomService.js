/* ==========================================================================
   DRAGME BACKEND SERVICE: ROOMS & COMMUNITIES (backend/services/roomService.js)
   Server-authoritative room directory, categories, and participant management
   ========================================================================== */

const ROOMS_CATALOG = [
  { id: 'general', name: 'General Arena', tag: 'r/general', desc: 'Main hub for roasts, uncensored memes, and daily debates.', category: 'General', members: 4230, online: 184, isLive: true },
  { id: 'tech_ai', name: 'Tech & AI Roasts', tag: 'r/tech_ai', desc: 'Debate codebases, framework wars, startup fails & LLM breakthroughs.', category: 'Tech/AI', members: 2890, online: 92, isLive: true },
  { id: 'confessions', name: 'Anonymous Confessions', tag: 'r/confessions', desc: 'Midnight confessions, secrets, and guilt drops under masked personas.', category: 'Confession', members: 3710, online: 140, isLive: true },
  { id: 'roasts', name: 'Roast Me Supreme', tag: 'r/roasts', desc: 'Submit your profile, photos, or project for supreme community roasts.', category: 'Roast', members: 1980, online: 67, isLive: false },
  { id: 'hot_takes', name: 'Nuclear Hot Takes', tag: 'r/hot_takes', desc: 'Unpopular opinions that will get you flamed. Cook or be cooked.', category: 'Hot Take', members: 2150, online: 88, isLive: false },
  { id: 'memes', name: 'Dank Memes & Shitposts', tag: 'r/memes', desc: 'Visual comedy, parody clips, and viral edits only.', category: 'Meme', members: 3100, online: 115, isLive: false }
];

const roomService = {
  getActiveRooms() {
    return ROOMS_CATALOG;
  },

  getRoomById(roomId) {
    const cleanId = String(roomId || '').toLowerCase().trim();
    return ROOMS_CATALOG.find(r => r.id === cleanId) || null;
  },

  createRoom({ name, tag, desc, user }) {
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length < 3 || cleanName.length > 40) {
      const err = new Error('Room name must be between 3 and 40 characters.');
      err.statusCode = 400;
      throw err;
    }

    const cleanDesc = String(desc || '').trim();
    const cleanTag = String(tag || cleanName.substring(0, 8)).toUpperCase().trim();
    const roomId = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const existing = ROOMS_CATALOG.find(r => r.id === roomId);
    if (existing) {
      const err = new Error('A room with this name already exists.');
      err.statusCode = 409;
      throw err;
    }

    const newRoom = {
      id: roomId,
      name: cleanName,
      tag: `r/${roomId}`,
      symbol: cleanTag,
      desc: cleanDesc || 'Community debate and roast room.',
      category: 'Community',
      ownerId: user ? user.id : null,
      ownerUsername: user ? user.username : 'Anonymous',
      members: 1,
      online: 1,
      isLive: true,
      createdAt: new Date().toISOString()
    };

    ROOMS_CATALOG.unshift(newRoom);
    return newRoom;
  }
};

module.exports = roomService;
