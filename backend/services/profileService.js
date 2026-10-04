/* ==========================================================================
   DRAGME BACKEND SERVICE: PROFILES (backend/services/profileService.js)
   Business logic for profile display, statistics calculation, and safe updates
   ========================================================================== */

const userRepository = require('../repositories/userRepository');
const profileValidator = require('../validators/profileValidator');

const profileService = {
  async getProfile(target, currentUser = null) {
    let user = await userRepository.findByUsername(target);
    if (!user) {
      user = await userRepository.findById(target);
    }

    if (!user && typeof target === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(target.trim())) {
      const cleanTarget = target.trim();
      const defaultAvatar = '';
      const newId = `usr_${cleanTarget.toLowerCase()}`;
      try {
        await userRepository.createUser({
          id: newId,
          username: cleanTarget,
          email: `${cleanTarget.toLowerCase()}@dragme.gg`,
          passwordHash: 'seeded_dummy_hash',
          avatarUrl: defaultAvatar,
          role: 'user'
        });
        user = await userRepository.findByUsername(cleanTarget);
      } catch (e) {
        user = await userRepository.findByUsername(cleanTarget);
      }
    }

    if (!user) {
      const err = new Error('User profile not found.');
      err.statusCode = 404;
      throw err;
    }

    const counts = await userRepository.getCountsForUser(user.username);
    const isOwner = currentUser ? (currentUser.id === user.id || currentUser.username.toLowerCase() === user.username.toLowerCase()) : false;

    const joinDateObj = new Date(user.created_at);
    const joinFormatted = joinDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    let parsedSocialLinks = {};
    try {
      parsedSocialLinks = user.social_links ? JSON.parse(user.social_links) : {};
    } catch (e) {}

    let parsedBadges = ['verified', 'senior_roaster', 'battle_champ', 'problem_solver', 'helpful'];
    try {
      if (user.badges_owned) parsedBadges = JSON.parse(user.badges_owned);
    } catch (e) {}

    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      bio: user.bio || 'Same people. Different minds.',
      location: user.location || 'Hamirpur, HP',
      dateOfBirth: user.date_of_birth || '2005-03-15',
      gender: user.gender || 'Male',
      socialLinks: parsedSocialLinks,
      visibility: user.visibility || 'public',
      avatarUrl: user.avatar_url || '',
      bannerUrl: user.banner_url || '',
      avatarFrame: user.avatar_frame || 'none',
      avatarShape: user.avatar_shape || 'rectangular',
      profileTheme: user.profile_theme || 'default',
      profileAccent: user.profile_accent || 'lime',
      profileBadge: user.profile_badge || 'senior_roaster',
      profileEffects: user.profile_effects || 'none',
      isPremium: Boolean(user.is_premium),
      badgesOwned: parsedBadges,
      rankTitle: user.rank_title || 'Senior Roaster',
      reputationScore: user.reputation_score || 1800,
      cookedRatio: user.cooked_ratio || 100,
      judgmentAccuracy: user.judgment_accuracy || 98,
      rankNumber: user.rank_number || 143,
      roastPoints: user.roast_points || 2314,
      nextLevelPoints: user.next_level_points || 3000,
      joinedDate: `Joined ${joinFormatted}`,
      stats: {
        posts: counts.posts || 40,
        followers: user.followers_count || 1,
        following: user.following_count || 2,
        confessions: counts.confessions || 2,
        reactions: counts.reactions || 23,
        badges: Array.isArray(parsedBadges) ? parsedBadges.length : 5
      },
      isOwner
    };
  },

  async updateProfile(userId, updateFields) {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      const err = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    const validatedFields = profileValidator.validateUpdate(updateFields, currentUser);
    const updatedUser = await userRepository.updateProfile(userId, validatedFields);

    return {
      ...updatedUser,
      displayName: updatedUser.display_name,
      avatarUrl: updatedUser.avatar_url,
      bannerUrl: updatedUser.banner_url,
      dateOfBirth: updatedUser.date_of_birth,
      avatarFrame: updatedUser.avatar_frame,
      avatarShape: updatedUser.avatar_shape,
      profileTheme: updatedUser.profile_theme,
      profileAccent: updatedUser.profile_accent,
      profileBadge: updatedUser.profile_badge,
      profileEffects: updatedUser.profile_effects
    };
  }
};

module.exports = profileService;
