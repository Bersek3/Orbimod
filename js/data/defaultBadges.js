/**
 * NEXUS MOD DECK — BADGES & ICONS DEFINITIONS
 * Official-style SVG icons for Twitch & Kick user badges
 */

export const BADGES = {
  twitch: {
    broadcaster: `<svg viewBox="0 0 20 20" fill="#E91916"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11.5v-7l6 3.5-6 3.5z"/></svg>`,
    moderator: `<svg viewBox="0 0 20 20" fill="#00AD03"><path d="M10 2L3 5v6c0 5 7 7 7 7s7-2 7-7V5l-7-3zm3 7.5l-3.5 3.5-2-2 1.4-1.4 0.6 0.6 2.1-2.1 1.4 1.4z"/></svg>`,
    vip: `<svg viewBox="0 0 20 20" fill="#E005B9"><path d="M4 4l3 5 3-5 3 5 3-5v12H4V4zm3 8h6v-2H7v2z"/></svg>`,
    subscriber: `<svg viewBox="0 0 20 20" fill="#9146FF"><path d="M10 2l2.4 5 5.6.8-4 4 1 5.6L10 15l-5 2.6 1-5.6-4-4 5.6-.8L10 2z"/></svg>`,
    verified: `<svg viewBox="0 0 20 20" fill="#9146FF"><path d="M10 2l2 2 3-.5 1 2.8 3 .8-.5 3 2 2-1.5 2.5.5 3-2.8 1-.8 3-3-.5-2 2-2-2-3 .5-1-2.8-3-.8.5-3-2-2 1.5-2.5-.5-3 2.8-1 .8-3 3 .5 2-2zm-1 11l5-5-1.4-1.4-3.6 3.6-1.6-1.6-1.4 1.4 3 3z"/></svg>`,
    prime: `<svg viewBox="0 0 20 20" fill="#00A8E8"><path d="M3 6l4 3 3-5 3 5 4-3v9H3V6z"/></svg>`
  },
  kick: {
    broadcaster: `<svg viewBox="0 0 20 20" fill="#53FC18"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 11.5v-7l6 3.5-6 3.5z"/></svg>`,
    moderator: `<svg viewBox="0 0 20 20" fill="#53FC18"><path d="M10 2L3 5v6c0 5 7 7 7 7s7-2 7-7V5l-7-3zm3 7.5l-3.5 3.5-2-2 1.4-1.4 0.6 0.6 2.1-2.1 1.4 1.4z"/></svg>`,
    vip: `<svg viewBox="0 0 20 20" fill="#FF5E00"><path d="M4 4l3 5 3-5 3 5 3-5v12H4V4zm3 8h6v-2H7v2z"/></svg>`,
    subscriber: `<svg viewBox="0 0 20 20" fill="#53FC18"><path d="M10 2l2.4 5 5.6.8-4 4 1 5.6L10 15l-5 2.6 1-5.6-4-4 5.6-.8L10 2z"/></svg>`,
    og: `<svg viewBox="0 0 20 20" fill="#00F2FE"><rect x="3" y="5" width="14" height="10" rx="2"/><text x="10" y="13" font-size="8" font-weight="bold" fill="#000" text-anchor="middle">OG</text></svg>`,
    verified: `<svg viewBox="0 0 20 20" fill="#53FC18"><circle cx="10" cy="10" r="8"/><path d="M7 10l2 2 4-4" stroke="#000" stroke-width="2" fill="none"/></svg>`,
    staff: `<svg viewBox="0 0 20 20" fill="#FF3366"><path d="M10 3a7 7 0 100 14 7 7 0 000-14zm0 2a5 5 0 110 10 5 5 0 010-10z"/></svg>`,
    bot: `<svg viewBox="0 0 20 20" fill="#94A3B8"><rect x="4" y="6" width="12" height="10" rx="2"/><circle cx="7" cy="10" r="1.5" fill="#000"/><circle cx="13" cy="10" r="1.5" fill="#000"/><path d="M8 13h4" stroke="#000" stroke-width="1.5"/></svg>`
  }
};

/**
 * Returns HTML string of badge icons for a user
 */
export function renderBadgesHTML(platform, badges = []) {
  if (!badges || badges.length === 0) return '';
  const pBadges = BADGES[platform] || BADGES.twitch;

  return badges.map(badgeKey => {
    const rawKey = badgeKey.toLowerCase();
    const svg = pBadges[rawKey];
    if (!svg) return '';
    return `<span class="badge-icon badge-${rawKey}" title="${rawKey.toUpperCase()}">${svg}</span>`;
  }).join('');
}
