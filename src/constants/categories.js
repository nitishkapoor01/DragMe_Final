/* ==========================================================================
   DRAGME CONSTANTS: CATEGORIES & POST TYPES (src/constants/categories.js)
   Metadata for 8 post categories with tags, classes and descriptions
   ========================================================================== */

export const CATEGORIES = [
  { id: 'Roast', label: 'Roast', tag: 'tag-roast', flairClass: 'flair-roast', icon: 'fa-solid fa-fire', desc: 'Savage critiques & teardowns' },
  { id: 'Confession', label: 'Confession', tag: 'tag-confession', flairClass: 'flair-confession', icon: 'fa-solid fa-mask', desc: 'Secrets & late-night truths' },
  { id: 'Discussion', label: 'Discussion', tag: 'tag-discuss', flairClass: 'flair-discuss', icon: 'fa-solid fa-comments', desc: 'Open arena debates' },
  { id: 'Hot Take', label: 'Hot Take', tag: 'tag-hot', flairClass: 'flair-orange', icon: 'fa-solid fa-bolt', desc: 'Unpopular opinions that burn' },
  { id: 'Meme', label: 'Meme', tag: 'tag-meme', flairClass: 'flair-gold', icon: 'fa-solid fa-face-laugh-squint', desc: 'Humor & viral satire' },
  { id: 'Question', label: 'Question', tag: 'tag-question', flairClass: 'flair-blue', icon: 'fa-solid fa-circle-question', desc: 'Ask the community anything' },
  { id: 'Tech/AI', label: 'Tech/AI', tag: 'tag-tech', flairClass: 'flair-cyan', icon: 'fa-solid fa-microchip', desc: 'Code, AI, startups & builds' },
  { id: 'Flex', label: 'Flex', tag: 'tag-flex', flairClass: 'flair-lime', icon: 'fa-solid fa-crown', desc: 'Milestones, wins & setups' }
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id.toLowerCase()] = cat;
  return acc;
}, {});
