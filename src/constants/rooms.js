/* ==========================================================================
   DRAGME CONSTANTS: ROOMS & COMMUNITIES (src/constants/rooms.js)
   Directory and metadata for active live debate rooms and communities
   ========================================================================== */

export const ROOMS_DATA = {
  general: {
    id: 'general',
    name: 'General Arena',
    tag: 'r/general',
    desc: 'Main hub for roasts, uncensored memes, and daily debates.',
    category: 'General',
    members: '4.2k',
    online: 184,
    isLive: true,
    banner: 'linear-gradient(135deg, rgba(183, 255, 60, 0.15), rgba(16, 21, 28, 0.95))'
  },
  tech_ai: {
    id: 'tech_ai',
    name: 'Tech & AI Roasts',
    tag: 'r/tech_ai',
    desc: 'Debate codebases, framework wars, startup fails & LLM breakthroughs.',
    category: 'Tech/AI',
    members: '2.9k',
    online: 92,
    isLive: true,
    banner: 'linear-gradient(135deg, rgba(41, 182, 246, 0.15), rgba(16, 21, 28, 0.95))'
  },
  confessions: {
    id: 'confessions',
    name: 'Anonymous Confessions',
    tag: 'r/confessions',
    desc: 'Midnight confessions, secrets, and guilt drops under masked personas.',
    category: 'Confession',
    members: '3.7k',
    online: 140,
    isLive: true,
    banner: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(16, 21, 28, 0.95))'
  },
  roasts: {
    id: 'roasts',
    name: 'Roast Me Supreme',
    tag: 'r/roasts',
    desc: 'Submit your profile, photos, or project for supreme community roasts.',
    category: 'Roast',
    members: '1.9k',
    online: 67,
    isLive: false,
    banner: 'linear-gradient(135deg, rgba(255, 71, 87, 0.15), rgba(16, 21, 28, 0.95))'
  },
  hot_takes: {
    id: 'hot_takes',
    name: 'Nuclear Hot Takes',
    tag: 'r/hot_takes',
    desc: 'Unpopular opinions that will get you flamed. Cook or be cooked.',
    category: 'Hot Take',
    members: '2.1k',
    online: 88,
    isLive: false,
    banner: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(16, 21, 28, 0.95))'
  },
  memes: {
    id: 'memes',
    name: 'Dank Memes & Shitposts',
    tag: 'r/memes',
    desc: 'Visual comedy, parody clips, and viral edits only.',
    category: 'Meme',
    members: '3.1k',
    online: 115,
    isLive: false,
    banner: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(16, 21, 28, 0.95))'
  }
};
