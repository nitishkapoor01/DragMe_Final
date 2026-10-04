/* ==========================================================================
   DRAGME BACKEND VALIDATOR: PROFILES (backend/validators/profileValidator.js)
   Server-side validation and whitelist sanitization for user profiles
   ========================================================================== */

const ALLOWED_GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
const ALLOWED_VISIBILITY = ['public', 'private', 'followers'];
const ALLOWED_SOCIAL_KEYS = ['instagram', 'youtube', 'twitter', 'discord', 'github', 'website'];

const profileValidator = {
  validateUpdate(payload = {}, currentUser = {}) {
    const {
      displayName,
      display_name,
      bio,
      location,
      dateOfBirth,
      date_of_birth,
      gender,
      socialLinks,
      social_links,
      visibility,
      avatarUrl,
      avatar_url,
      bannerUrl,
      banner_url,
      avatarFrame,
      avatar_frame,
      avatarShape,
      avatar_shape,
      profileTheme,
      profile_theme,
      profileAccent,
      profile_accent,
      profileBadge,
      profile_badge,
      profileEffects,
      profile_effects
    } = payload;

    const rawDisplayName = displayName !== undefined ? displayName : display_name;
    const cleanDisplayName = rawDisplayName !== undefined
      ? String(rawDisplayName).trim().slice(0, 50)
      : (currentUser.display_name || currentUser.displayName || currentUser.username || 'User');

    const cleanBio = bio !== undefined
      ? String(bio).trim().slice(0, 200)
      : (currentUser.bio || '');

    const cleanLocation = location !== undefined
      ? String(location).trim().slice(0, 80)
      : (currentUser.location || '');

    const rawDob = dateOfBirth !== undefined ? dateOfBirth : date_of_birth;
    const cleanDob = rawDob !== undefined
      ? String(rawDob).trim().slice(0, 30)
      : (currentUser.date_of_birth || currentUser.dateOfBirth || '');

    const cleanGender = (gender && ALLOWED_GENDERS.includes(gender))
      ? gender
      : (currentUser.gender || 'Male');

    const rawSocial = socialLinks !== undefined ? socialLinks : social_links;
    let cleanSocialLinksStr = currentUser.social_links || '{}';
    if (rawSocial !== undefined) {
      let socialObj = rawSocial;
      if (typeof rawSocial === 'string') {
        try {
          socialObj = JSON.parse(rawSocial);
        } catch (e) {
          socialObj = {};
        }
      }
      if (typeof socialObj === 'object' && socialObj !== null) {
        const sanitizedLinks = {};
        for (const key of ALLOWED_SOCIAL_KEYS) {
          if (socialObj[key] && typeof socialObj[key] === 'string') {
            sanitizedLinks[key] = socialObj[key].trim().slice(0, 200);
          }
        }
        cleanSocialLinksStr = JSON.stringify(sanitizedLinks);
      }
    }

    const cleanVisibility = (visibility && ALLOWED_VISIBILITY.includes(visibility))
      ? visibility
      : (currentUser.visibility || 'public');

    const rawAvatar = avatarUrl !== undefined ? avatarUrl : avatar_url;
    const cleanAvatarUrl = rawAvatar !== undefined
      ? String(rawAvatar).trim()
      : (currentUser.avatar_url || currentUser.avatarUrl || '');

    const rawBanner = bannerUrl !== undefined ? bannerUrl : banner_url;
    const cleanBannerUrl = rawBanner !== undefined
      ? String(rawBanner).trim()
      : (currentUser.banner_url || currentUser.bannerUrl || '');

    const rawFrame = avatarFrame !== undefined ? avatarFrame : avatar_frame;
    const cleanAvatarFrame = rawFrame !== undefined
      ? String(rawFrame).trim().slice(0, 50)
      : (currentUser.avatar_frame || currentUser.avatarFrame || 'none');

    const rawShape = avatarShape !== undefined ? avatarShape : avatar_shape;
    const cleanAvatarShape = rawShape !== undefined
      ? String(rawShape).trim().slice(0, 50)
      : (currentUser.avatar_shape || currentUser.avatarShape || 'rectangular');

    const rawTheme = profileTheme !== undefined ? profileTheme : profile_theme;
    const cleanProfileTheme = rawTheme !== undefined
      ? String(rawTheme).trim().slice(0, 50)
      : (currentUser.profile_theme || currentUser.profileTheme || 'default');

    const rawAccent = profileAccent !== undefined ? profileAccent : profile_accent;
    const cleanProfileAccent = rawAccent !== undefined
      ? String(rawAccent).trim().slice(0, 50)
      : (currentUser.profile_accent || currentUser.profileAccent || 'lime');

    const rawBadge = profileBadge !== undefined ? profileBadge : profile_badge;
    const cleanProfileBadge = rawBadge !== undefined
      ? String(rawBadge).trim().slice(0, 50)
      : (currentUser.profile_badge || currentUser.profileBadge || 'senior_roaster');

    const rawEffects = profileEffects !== undefined ? profileEffects : profile_effects;
    const cleanProfileEffects = rawEffects !== undefined
      ? String(rawEffects).trim().slice(0, 50)
      : (currentUser.profile_effects || currentUser.profileEffects || 'none');

    return {
      displayName: cleanDisplayName,
      bio: cleanBio,
      location: cleanLocation,
      dateOfBirth: cleanDob,
      gender: cleanGender,
      socialLinks: cleanSocialLinksStr,
      visibility: cleanVisibility,
      avatarUrl: cleanAvatarUrl,
      bannerUrl: cleanBannerUrl,
      avatarFrame: cleanAvatarFrame,
      avatarShape: cleanAvatarShape,
      profileTheme: cleanProfileTheme,
      profileAccent: cleanProfileAccent,
      profileBadge: cleanProfileBadge,
      profileEffects: cleanProfileEffects
    };
  }
};

module.exports = profileValidator;
