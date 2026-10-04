/* ==========================================================================
   DRAGME BACKEND SERVICE: REACTIONS & CROWNS (backend/services/reactionService.js)
   Business logic for standard & super crown reactions, reaction switching, and who-reacted lists
   ========================================================================== */

const postRepository = require('../repositories/postRepository');
const reactionRepository = require('../repositories/reactionRepository');
const { formatTimeAgo } = require('../utils/timeUtils');

const VALID_REACTIONS = ['crown', 'fire', 'insightful', 'support', 'heartfelt', 'mindblown'];

const REACTION_ICON_MAP = {
  crown: { icon: 'fa-solid fa-crown', label: 'Crown', color: '#C6FF00' },
  fire: { icon: 'fa-solid fa-fire', label: 'Fire', color: '#FF7043' },
  insightful: { icon: 'fa-solid fa-lightbulb', label: 'Insightful', color: '#29B6F6' },
  support: { icon: 'fa-solid fa-handshake', label: 'Support', color: '#5C6BC0' },
  heartfelt: { icon: 'fa-solid fa-heart', label: 'Heartfelt', color: '#AB47BC' },
  mindblown: { icon: 'fa-solid fa-brain', label: 'Mind Blown', color: '#FFCA28' }
};

const reactionService = {
  async handleVoteOrReact({ postId, userId, reactionType, isSuper = false, remove = false, switchOnly = false }) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found.');
      err.statusCode = 404;
      throw err;
    }

    const rawType = (reactionType || 'crown').toString().toLowerCase().trim();
    const targetReaction = VALID_REACTIONS.includes(rawType) ? rawType : 'crown';
    const isSuperVal = Boolean(isSuper);
    const explicitRemove = Boolean(remove);

    const existingVote = await reactionRepository.getVote(userId, postId);

    let hasVoted = false;
    let newDragCount = post.drag_count;
    let newHeat = post.heat_percent;
    let finalReaction = targetReaction;
    let finalIsSuper = isSuperVal;

    if (existingVote) {
      const sameType = (existingVote.reaction_type || 'crown') === targetReaction;
      const sameSuper = Boolean(existingVote.is_super) === isSuperVal;

      if (explicitRemove || (sameType && sameSuper && !switchOnly)) {
        await reactionRepository.deleteVote(userId, postId);
        newDragCount = Math.max(0, post.drag_count - 1);
        hasVoted = false;
        finalReaction = null;
        finalIsSuper = false;
      } else {
        await reactionRepository.updateVote({
          userId,
          postId,
          reactionType: targetReaction,
          isSuper: isSuperVal ? 1 : (existingVote.is_super || 0)
        });
        hasVoted = true;
        finalReaction = targetReaction;
        finalIsSuper = isSuperVal || Boolean(existingVote.is_super);
        newHeat = Math.min(100, post.heat_percent + (isSuperVal ? 4 : 1));
      }
    } else {
      await reactionRepository.createVote({
        userId,
        postId,
        reactionType: targetReaction,
        isSuper: isSuperVal
      });
      newDragCount = post.drag_count + 1;
      newHeat = Math.min(100, post.heat_percent + (isSuperVal ? 5 : 2));
      hasVoted = true;
      finalReaction = targetReaction;
      finalIsSuper = isSuperVal;
    }

    await postRepository.updateCounts(postId, {
      dragCount: newDragCount,
      heatPercent: newHeat
    });

    return {
      postId,
      hasVoted,
      reactionType: finalReaction,
      isSuper: finalIsSuper,
      dragCount: newDragCount,
      heatPercent: newHeat
    };
  },

  async getWhoReacted(postId, currentUserId = null) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const err = new Error('Post not found.');
      err.statusCode = 404;
      throw err;
    }

    const reactorRows = await reactionRepository.getReactorsForPost(postId);

    const counts = { crown: 0, fire: 0, insightful: 0, support: 0, heartfelt: 0, mindblown: 0 };

    const formattedReactors = reactorRows.map(r => {
      const type = (r.reaction_type || 'crown').toLowerCase();
      if (counts[type] !== undefined) counts[type]++;

      const isCurrent = currentUserId && currentUserId === r.user_id;
      const meta = REACTION_ICON_MAP[type] || REACTION_ICON_MAP.crown;

      return {
        userId: r.user_id,
        username: r.username || 'dragme_user',
        displayName: r.display_name || r.username || 'Arena Member',
        avatarUrl: r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.username || 'reactor')}`,
        rankTitle: r.rank_title || 'Roaster',
        isPremium: Boolean(r.is_premium),
        isSuper: Boolean(r.is_super),
        isCurrentUser: Boolean(isCurrent),
        reactionType: type,
        reactionIcon: meta.icon,
        reactionLabel: meta.label,
        reactionColor: meta.color,
        timeAgo: formatTimeAgo(r.created_at)
      };
    });

    const topReactors = formattedReactors.filter(r => r.isSuper || r.isPremium).slice(0, 15);
    const friends = formattedReactors.slice(0, 10);

    return {
      postId,
      total: formattedReactors.length,
      counts,
      all: formattedReactors,
      friends,
      topReactors
    };
  }
};

module.exports = reactionService;
