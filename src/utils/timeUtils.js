/* ==========================================================================
   DRAGME CORE UTILS: TIME UTILITIES (src/utils/timeUtils.js)
   Human readable time formatting for client UI
   ========================================================================== */

export function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = Math.max(0, now - past);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
