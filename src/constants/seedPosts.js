/* ==========================================================================
   DRAGME CONSTANTS: SEED POSTS (src/constants/seedPosts.js)
   Fallback default posts for offline development and initial cold boot
   ========================================================================== */

export const SEED_POSTS = [
  {
    id: 'post-seed-1',
    title: 'First Full-Stack Post in DRAGME Arena',
    author: 'NightRider',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NightRider',
    isAnonymous: false,
    room: 'tech_ai',
    roomDisplayName: 'r/tech_ai',
    timeAgo: 'Just now',
    flair: 'Roast',
    flairClass: 'flair-roast',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    content: 'Unfiltered high-energy discussion saved directly to the DRAGME backend.',
    dragCount: 12,
    commentCount: 4,
    heatPercent: 96,
    hasVoted: false,
    reactionType: null,
    isSuper: false,
    isSaved: false,
    comments: [
      { id: 'c1', author: 'CodeSlayer', text: 'This looks incredibly crisp! ⚡', timeAgo: '5m ago' }
    ]
  },
  {
    id: 'post-seed-2',
    title: 'Late Night Confession: I deleted production DB in 2021',
    author: 'Masked Persona',
    avatar: '',
    isAnonymous: true,
    room: 'confessions',
    roomDisplayName: 'r/confessions',
    timeAgo: '18m ago',
    flair: 'Confession',
    flairClass: 'flair-confession',
    imageUrl: null,
    content: 'I told everyone it was an AWS outage. Nobody ever found out.',
    dragCount: 38,
    commentCount: 9,
    heatPercent: 88,
    hasVoted: false,
    reactionType: null,
    isSuper: false,
    isSaved: false,
    comments: []
  }
];
