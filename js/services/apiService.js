/**
 * NEXUS MOD DECK — OFFICIAL TWITCH HELIX & KICK API SERVICE
 * Validates OAuth tokens, auto-fetches channels where the user is a Moderator,
 * queries channel metadata, and executes authenticated Helix moderation actions.
 */

export class ApiService {
  constructor() {
    // Official Twitch Developer Client ID for OrbiMod
    this.defaultTwitchClientId = '36bmcu0464pc3ja5pgoghf44mkt0de';
  }

  getTwitchClientId() {
    return localStorage.getItem('nexus_twitch_custom_client_id') || this.defaultTwitchClientId;
  }

  saveTwitchClientId(clientId) {
    if (clientId) {
      localStorage.setItem('nexus_twitch_custom_client_id', clientId.trim());
    } else {
      localStorage.removeItem('nexus_twitch_custom_client_id');
    }
  }

  getCurrentRedirectUri() {
    return window.location.origin + window.location.pathname;
  }

  // ==========================================
  // TWITCH HELIX & OAUTH API
  // ==========================================

  /**
   * Generates direct link to TwitchTokenGenerator with all required moderation scopes pre-selected.
   * This avoids the redirect_mismatch error from unregistered localhost URIs.
   */
  getQuickTokenGeneratorUrl() {
    const scopes = [
      'chat:read',
      'chat:edit',
      'user:read:moderated_channels',
      'moderator:manage:banned_users',
      'moderator:manage:chat_messages',
      'moderator:manage:chat_settings',
      'moderator:read:chatters'
    ].join('+');
    return `https://twitchtokengenerator.com/?scope=${scopes}`;
  }

  /**
   * Generates the official Twitch OAuth authorization URL for users with custom registered Client IDs
   */
  getTwitchAuthUrl(clientId = null) {
    const cid = clientId || this.defaultTwitchClientId;
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
      'chat:read',
      'chat:edit',
      'user:read:moderated_channels',
      'moderator:manage:banned_users',
      'moderator:manage:chat_messages',
      'moderator:manage:chat_settings',
      'moderator:read:chatters'
    ].join(' ');

    return `https://id.twitch.tv/oauth2/authorize?client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&force_verify=true`;
  }

  /**
   * Validates a Twitch OAuth token and returns token metadata (user_id, login, scopes, expires_in)
   */
  async validateTwitchToken(token) {
    if (!token) return { valid: false, error: 'Token no proporcionado' };
    const cleanToken = token.replace(/^oauth:/i, '').trim();

    try {
      const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${cleanToken}`
        }
      });

      if (!res.ok) {
        return { valid: false, error: `Token inválido o expirado (Código HTTP ${res.status})` };
      }

      const data = await res.json();
      return {
        valid: true,
        token: cleanToken,
        clientId: data.client_id,
        login: data.login,
        userId: data.user_id,
        scopes: data.scopes || [],
        expiresIn: data.expires_in
      };
    } catch (err) {
      return { valid: false, error: 'Error de red al conectar con Twitch OAuth: ' + err.message };
    }
  }

  /**
   * Fetches user profile from Twitch Helix API (avatar, display name, etc.)
   */
  async fetchTwitchUserProfile(token, clientId) {
    try {
      const res = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': clientId
        }
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        return data.data[0];
      }
      return null;
    } catch (e) {
      console.warn('Error fetching Twitch user profile:', e);
      return null;
    }
  }

  /**
   * Retrieves all channels where the authenticated user has MODERATOR permissions!
   * Endpoint: GET https://api.twitch.tv/helix/moderation/channels?user_id=...
   */
  async fetchModeratedChannels(token, clientId, userId) {
    try {
      const res = await fetch(`https://api.twitch.tv/helix/moderation/channels?user_id=${userId}&first=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': clientId
        }
      });

      if (!res.ok) {
        // Fallback: If scope is missing or error
        return { success: false, channels: [], error: `No se pudo obtener canales moderados (${res.status})` };
      }

      const data = await res.json();
      const channels = (data.data || []).map(ch => ({
        id: `ch-twitch-${ch.broadcaster_login}`,
        name: ch.broadcaster_login,
        displayName: ch.broadcaster_name,
        broadcasterId: ch.broadcaster_id,
        platform: 'twitch',
        avatar: '',
        viewers: 0,
        isLive: true,
        videoEnabled: true,
        slowMode: 0,
        subOnly: false,
        followOnly: false,
        emoteOnly: false
      }));

      // Enrich with avatars if available
      if (channels.length > 0) {
        const logins = channels.map(c => `login=${c.name}`).slice(0, 50).join('&');
        try {
          const userRes = await fetch(`https://api.twitch.tv/helix/users?${logins}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Client-Id': clientId
            }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            userData.data.forEach(u => {
              const match = channels.find(c => c.name.toLowerCase() === u.login.toLowerCase());
              if (match) {
                match.avatar = u.profile_image_url;
              }
            });
          }
        } catch (e) {}
      }

      return { success: true, channels: channels };
    } catch (e) {
      return { success: false, channels: [], error: e.message };
    }
  }

  // ==========================================
  // KICK API & CHANNEL LOOKUP
  // ==========================================

  /**
   * Fetches public channel information from Kick API (chatroom ID, live status, avatar, viewers)
   */
  async fetchKickChannel(channelSlug) {
    const cleanSlug = channelSlug.trim().toLowerCase().replace('@', '');
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${cleanSlug}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Canal de Kick no encontrado (${res.status})`
        };
      }

      const data = await res.json();
      const isLive = !!(data.livestream && data.livestream.is_live);
      const viewers = (data.livestream && data.livestream.viewer_count) || 0;
      const avatar = (data.user && data.user.profile_pic) || 'https://files.kick.com/images/user/default/profile_image.png';

      return {
        success: true,
        channel: {
          id: `ch-kick-${cleanSlug}`,
          name: cleanSlug,
          displayName: (data.user && data.user.username) || cleanSlug,
          platform: 'kick',
          chatroomId: data.chatroom ? data.chatroom.id : null,
          broadcasterId: data.user ? data.user.id : null,
          avatar: avatar,
          viewers: viewers,
          isLive: isLive,
          videoEnabled: true,
          slowMode: data.chatroom ? (data.chatroom.slow_mode ? 5 : 0) : 0,
          subOnly: data.chatroom ? !!data.chatroom.subscribers_mode : false,
          followOnly: data.chatroom ? !!data.chatroom.followers_mode : false,
          emoteOnly: data.chatroom ? !!data.chatroom.emotes_mode : false
        }
      };
    } catch (e) {
      return {
        success: false,
        error: 'Error al consultar API de Kick: ' + e.message
      };
    }
  }
}

export const apiService = new ApiService();
