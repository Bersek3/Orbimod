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
        isLive: false,
        videoEnabled: false,
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

        // Also check live streams in parallel
        try {
          const streamsRes = await fetch(`https://api.twitch.tv/helix/streams?${logins.replace(/login=/g, 'user_login=')}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Client-Id': clientId
            }
          });
          if (streamsRes.ok) {
            const streamsData = await streamsRes.json();
            const liveMap = new Map((streamsData.data || []).map(s => [s.user_login.toLowerCase(), s]));
            channels.forEach(ch => {
              const stream = liveMap.get(ch.name.toLowerCase());
              if (stream) {
                ch.isLive = true;
                ch.viewers = stream.viewer_count || 0;
                ch.videoEnabled = true;
              } else {
                ch.isLive = false;
                ch.viewers = 0;
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

  /**
   * Fetches accurate Twitch channel profile & real-time live status
   */
  async fetchTwitchChannel(channelLogin) {
    const clean = channelLogin.trim().toLowerCase().replace(/[@#]/g, '');
    if (!clean) return { success: false, error: 'Nombre de canal no proporcionado' };

    let displayName = clean;
    let avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${clean}`;
    let isLive = false;
    let viewers = 0;
    let exists = false;

    // Method 1: Twitch GQL (Fastest, most accurate public query without rate-limits)
    try {
      const gqlRes = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: {
          'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          operationName: 'UseLive',
          variables: { channelLogin: clean },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: '630141334e941198f396737a8e253cb37d35dc049f7f46124430155b93d6d532'
            }
          }
        }])
      });

      if (gqlRes.ok) {
        const gqlData = await gqlRes.json();
        const userObj = gqlData?.[0]?.data?.user;
        if (userObj) {
          exists = true;
          displayName = userObj.displayName || clean;
          if (userObj.profileImageURL) avatar = userObj.profileImageURL;
          
          if (userObj.stream && userObj.stream.type === 'live') {
            isLive = true;
            viewers = userObj.stream.viewersCount || 0;
          } else if (userObj.stream) {
            isLive = true;
            viewers = userObj.stream.viewersCount || 0;
          } else {
            isLive = false;
            viewers = 0;
          }
        }
      }
    } catch (e) {
      console.warn('[Twitch GQL lookup]', e);
    }

    // Method 2: Decapi Verification (Secondary fallback)
    if (!exists) {
      try {
        const uptimeRes = await fetch(`https://decapi.me/twitch/uptime/${clean}`);
        if (uptimeRes.ok) {
          const txt = (await uptimeRes.text()).trim();
          if (txt.toLowerCase().includes('not found') || txt.toLowerCase().includes('does not exist')) {
            return { success: false, error: `Canal de Twitch #${clean} no existe` };
          }
          exists = true;
          if (txt.toLowerCase().includes('offline') || txt.toLowerCase().includes('error')) {
            isLive = false;
            viewers = 0;
          } else {
            isLive = true;
            try {
              const vRes = await fetch(`https://decapi.me/twitch/viewercount/${clean}`);
              if (vRes.ok) {
                const vTxt = await vRes.text();
                viewers = parseInt(vTxt.replace(/[^0-9]/g, ''), 10) || 0;
              }
            } catch (e) {}
          }
        }

        const avRes = await fetch(`https://decapi.me/twitch/avatar/${clean}`);
        if (avRes.ok) {
          const avTxt = (await avRes.text()).trim();
          if (avTxt.startsWith('http')) avatar = avTxt;
        }
      } catch (e) {}
    }

    // Method 3: Twitch Helix (If user has valid OAuth token)
    let token = '';
    let clientId = this.getTwitchClientId();
    try {
      const p = JSON.parse(localStorage.getItem('nexus_stream_profiles') || '{}');
      const c = JSON.parse(localStorage.getItem('nexus_mod_credentials') || '{}');
      token = p.twitch?.token || c.twitchToken || '';
      if (p.twitch?.clientId) clientId = p.twitch.clientId;
    } catch (e) {}

    if (token) {
      try {
        const sRes = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(clean)}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': clientId }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.data && sData.data.length > 0) {
            isLive = true;
            viewers = sData.data[0].viewer_count || 0;
          } else {
            isLive = false;
            viewers = 0;
          }
        }
      } catch (e) {}
    }

    return {
      success: true,
      channel: {
        id: `ch-twitch-${clean}`,
        name: clean,
        displayName: displayName,
        platform: 'twitch',
        avatar: avatar,
        viewers: viewers,
        isLive: isLive,
        videoEnabled: isLive,
        slowMode: 0,
        subOnly: false,
        followOnly: false,
        emoteOnly: false
      }
    };
  }

  // ==========================================
  // KICK API & OAUTH 2.0 / DEV INTEGRATION
  // ==========================================

  getKickClientId() {
    return localStorage.getItem('nexus_kick_custom_client_id') || '01M0VT0JC58YQEVGRHM8JFXQX3';
  }

  saveKickClientId(clientId) {
    if (clientId) {
      localStorage.setItem('nexus_kick_custom_client_id', clientId.trim());
    } else {
      localStorage.removeItem('nexus_kick_custom_client_id');
    }
  }

  getKickClientSecret() {
    return localStorage.getItem('nexus_kick_custom_client_secret') || 'ee10e46fccf83a105e86834973db23cabcad279f33acf48bd4f6b5749884bb20';
  }

  saveKickClientSecret(secret) {
    if (secret) {
      localStorage.setItem('nexus_kick_custom_client_secret', secret.trim());
    } else {
      localStorage.removeItem('nexus_kick_custom_client_secret');
    }
  }

  _generatePKCEVerifier() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    let str = '';
    for (let i = 0; i < array.byteLength; i++) {
      str += String.fromCharCode(array[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async _generatePKCEChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Generates official Kick Developer OAuth 2.1 URL with PKCE
   */
  async getKickAuthUrl(clientId = null) {
    const cid = clientId || this.getKickClientId();
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = 'user:read channel:read chat:write';

    // Generate PKCE code_verifier and code_challenge (mandatory by Kick OAuth 2.1)
    const verifier = this._generatePKCEVerifier();
    sessionStorage.setItem('kick_pkce_verifier', verifier);
    const challenge = await this._generatePKCEChallenge(verifier);
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('kick_oauth_state', state);

    return `https://id.kick.com/oauth/authorize?client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&state=${encodeURIComponent(state)}`;
  }

  /**
   * Exchanges Kick authorization code for user access token
   */
  async exchangeKickAuthCode(code, clientId = null, clientSecret = null) {
    const cid = clientId || this.getKickClientId();
    const secret = clientSecret || this.getKickClientSecret();
    const redirectUri = window.location.origin + window.location.pathname;
    const verifier = sessionStorage.getItem('kick_pkce_verifier') || '';

    try {
      // 1. Try local proxy first
      const proxyRes = await fetch('/api/kick-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          client_id: cid,
          client_secret: secret,
          redirect_uri: redirectUri,
          code_verifier: verifier
        })
      });

      if (proxyRes.ok) {
        const tokenData = await proxyRes.json();
        return { success: true, tokenData };
      }
    } catch (e) {
      console.warn('[Kick token proxy fallback]', e);
    }

    try {
      // 2. Direct token endpoint fallback
      const directRes = await fetch('https://id.kick.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cid,
          client_secret: secret,
          code: code,
          redirect_uri: redirectUri,
          code_verifier: verifier
        })
      });

      if (directRes.ok) {
        const tokenData = await directRes.json();
        return { success: true, tokenData };
      }
    } catch (e) {
      console.warn('[Direct Kick token error]', e);
    }

    return { success: false, error: 'No se pudo intercambiar el código OAuth de Kick' };
  }

  /**
   * Fetches public channel information from Kick API (chatroom ID, live status, avatar, viewers)
   */
  async fetchKickChannel(channelSlug) {
    const cleanSlug = channelSlug.trim().toLowerCase().replace(/[@#]/g, '');
    if (!cleanSlug) return { success: false, error: 'Nombre de canal no proporcionado' };

    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${cleanSlug}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Canal de Kick #${cleanSlug} no encontrado (${res.status})`
        };
      }

      const data = await res.json();
      const livestream = data.livestream;
      const isLive = Boolean(livestream && livestream.is_live === true);
      const viewers = isLive ? (livestream.viewer_count || 0) : 0;
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
          videoEnabled: isLive,
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

  /**
   * Checks if a given username is a moderator or broadcaster in a Kick channel
   */
  async checkKickModStatus(channelSlug, username) {
    const cleanSlug = (channelSlug || '').trim().toLowerCase().replace(/[@#]/g, '');
    const cleanUser = (username || '').trim().toLowerCase().replace(/[@#]/g, '');

    if (!cleanSlug || !cleanUser) {
      return { isMod: false, isOwner: false, error: 'Datos incompletos' };
    }

    if (cleanSlug === cleanUser) {
      return { isMod: true, isOwner: true, role: 'owner' };
    }

    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${cleanSlug}/users/${cleanUser}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        const isMod = Boolean(data.is_moderator || data.is_channel_owner || data.is_staff);
        const isOwner = Boolean(data.is_channel_owner);
        return {
          isMod: isMod,
          isOwner: isOwner,
          role: isOwner ? 'owner' : (isMod ? 'mod' : 'viewer'),
          data: data
        };
      }
    } catch (e) {
      console.warn('[Kick Mod Check Error]', e);
    }

    return { isMod: false, isOwner: false, role: 'viewer' };
  }

  /**
   * Checks if current authenticated user is moderator or broadcaster in a Twitch channel
   */
  async checkTwitchModStatus(channelSlug) {
    const cleanName = (channelSlug || '').trim().toLowerCase().replace(/[@#]/g, '');
    if (!cleanName) return { isMod: false, role: 'viewer' };

    try {
      const profiles = JSON.parse(localStorage.getItem('nexus_mod_profiles_v1') || '{}');
      const creds = JSON.parse(localStorage.getItem('nexus_mod_auth_creds_v1') || '{}');
      const twitchUser = (profiles.twitch?.login || creds.twitchUsername || '').toLowerCase();
      const token = profiles.twitch?.token || creds.twitchToken;
      const clientId = profiles.twitch?.clientId || this.getTwitchClientId();
      const userId = profiles.twitch?.userId;

      // Channel owner is always broadcaster/mod
      if (twitchUser && cleanName === twitchUser) {
        return { isMod: true, role: 'owner' };
      }

      if (token && userId) {
        const modRes = await this.fetchModeratedChannels(token, clientId, userId);
        if (modRes.success && modRes.channels) {
          const isMod = modRes.channels.some(c => (c.name || c.broadcaster_login || '').toLowerCase() === cleanName);
          if (isMod) return { isMod: true, role: 'mod' };
        }
      }
    } catch (e) {
      console.warn('[Twitch Mod Check error]', e);
    }

    return { isMod: false, role: 'viewer' };
  }

  /**
   * Batch checks real-time Live / Offline status for a list of channels
   */
  async checkLiveStatus(channels) {
    if (!channels || channels.length === 0) return channels;

    const promises = channels.map(async (ch) => {
      if (ch.platform === 'twitch') {
        const res = await this.fetchTwitchChannel(ch.name);
        if (res.success) {
          ch.isLive = res.channel.isLive;
          ch.viewers = res.channel.viewers;
          if (res.channel.avatar) ch.avatar = res.channel.avatar;
          if (res.channel.displayName) ch.displayName = res.channel.displayName;
        }
      } else if (ch.platform === 'kick') {
        const res = await this.fetchKickChannel(ch.name);
        if (res.success) {
          ch.isLive = res.channel.isLive;
          ch.viewers = res.channel.viewers;
          if (res.channel.avatar) ch.avatar = res.channel.avatar;
          if (res.channel.displayName) ch.displayName = res.channel.displayName;
        }
      }
      return ch;
    });

    await Promise.all(promises);
    return channels;
  }
}

export const apiService = new ApiService();
