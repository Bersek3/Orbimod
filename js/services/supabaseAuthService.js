/**
 * ORBIMOD — SUPABASE AUTHENTICATION & CLOUD DATA PERSISTENCE SERVICE
 * Official Supabase Client Integration for User Accounts, Panel Layouts, and Moderation History
 */

const DEFAULT_SUPABASE_URL = 'https://kypzqrqdcqytbxuqpvzg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_EMRaEigGHD97WRgY6uBy2Q_NoO4Jd0x';

const STORAGE_KEY_AUTH = 'orbimod_supabase_session_v2';
const STORAGE_KEY_CONFIG = 'orbimod_supabase_config_v2';

class SupabaseAuthService {
  constructor() {
    this.supabaseConfig = this._loadConfig();
    this.client = null;
    this.session = this._loadSession();
    this.listeners = [];

    this._initClient();
  }

  _loadConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          url: parsed.url || DEFAULT_SUPABASE_URL,
          anonKey: parsed.anonKey || DEFAULT_SUPABASE_KEY,
          isConfigured: true
        };
      }
    } catch (e) { }

    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_KEY,
      isConfigured: true
    };
  }

  _saveConfig(config) {
    this.supabaseConfig = { ...this.supabaseConfig, ...config };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.supabaseConfig));
    this._initClient();
  }

  _initClient() {
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(url, key);
        console.log('[Supabase] Client initialized successfully for:', url);

        // Listen to native Supabase auth state changes
        this.client.auth.onAuthStateChange((event, session) => {
          if (session && session.user) {
            const normalizedSession = {
              accessToken: session.access_token,
              user: {
                id: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'Usuario'),
                avatar: session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${session.user.email}`
              }
            };
            this._saveSession(normalizedSession);
          } else if (event === 'SIGNED_OUT') {
            this._saveSession(null);
          }
        });
      } catch (e) {
        console.warn('[Supabase client init error]', e);
      }
    }
  }

  _loadSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  _saveSession(session) {
    this.session = session;
    if (session) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
    this._notifyListeners();
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    callback(this.session);
  }

  _notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.session); } catch (e) { console.error('Auth listener error:', e); }
    });
  }

  getCurrentUser() {
    return this.session ? this.session.user : null;
  }

  isAuthenticated() {
    return !!this.session && !!this.session.user;
  }

  getClient() {
    if (!this.client && window.supabase && typeof window.supabase.createClient === 'function') {
      this._initClient();
    }
    return this.client;
  }

  /**
   * Login with Email & Password via Supabase
   */
  async signInWithPassword(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Por favor ingresa tu correo y contraseña.' };
    }

    const client = this.getClient();

    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) {
          return { success: false, error: error.message || 'Credenciales incorrectas en Supabase' };
        }

        const session = {
          accessToken: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.display_name || data.user.user_metadata?.username || email.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`
          }
        };

        this._saveSession(session);
        return { success: true, user: session.user };
      } catch (err) {
        return { success: false, error: 'Error de conexión con Supabase: ' + err.message };
      }
    }

    // Direct REST API Fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;

    try {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error_description || data.msg || 'Error al iniciar sesión' };
      }

      const session = {
        accessToken: data.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.user_metadata?.display_name || email.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`
        }
      };

      this._saveSession(session);
      return { success: true, user: session.user };
    } catch (err) {
      return { success: false, error: 'Error de conexión con Supabase: ' + err.message };
    }
  }

  /**
   * Register new account with Email & Password in Supabase
   */
  async signUp(email, password, displayName = '') {
    if (!email || !password) {
      return { success: false, error: 'Por favor ingresa un correo y contraseña válida.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const username = displayName.trim() || email.split('@')[0];
    const client = this.getClient();

    if (client) {
      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              display_name: username,
              username: username,
              avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
            }
          }
        });

        if (error) {
          return { success: false, error: error.message || 'Error al registrar en Supabase' };
        }

        const session = {
          accessToken: data.session ? data.session.access_token : 'pending-confirmation',
          user: {
            id: data.user ? data.user.id : ('usr-' + Date.now()),
            email: email,
            displayName: username,
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
          }
        };

        this._saveSession(session);
        return { success: true, user: session.user, confirmationRequired: !data.session };
      } catch (err) {
        return { success: false, error: 'Error al conectar con Supabase: ' + err.message };
      }
    }

    // Direct REST API fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;

    try {
      const response = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({
          email,
          password,
          data: { display_name: username, username: username }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error_description || data.msg || 'Error al registrar cuenta' };
      }

      const session = {
        accessToken: data.access_token || 'pending-verification',
        user: {
          id: data.id || ('usr-' + Date.now()),
          email: email,
          displayName: username,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
        }
      };

      this._saveSession(session);
      return { success: true, user: session.user };
    } catch (err) {
      return { success: false, error: 'Error al conectar con Supabase: ' + err.message };
    }
  }

  /**
   * Sign In with Google OAuth via Supabase
   */
  async signInWithGoogle() {
    const client = this.getClient();
    const redirectTo = window.location.origin + window.location.pathname;

    if (client) {
      try {
        const { data, error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Direct OAuth redirect URL fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    window.location.href = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    return { success: true };
  }

  /**
   * Save User Panel Layout & Channel Deck Preferences in Supabase
   */
  async saveUserLayout(userId, layoutData, email = null) {
    if (!userId || !layoutData) return { success: false };
    const client = this.getClient();
    const userEmail = (email || this.getCurrentUser()?.email || '').trim().toLowerCase() || null;

    const payload = {
      user_id: userId,
      layout_type: layoutData.layoutType || layoutData.layout || 'layout-grid-2x2',
      channels: Array.isArray(layoutData.channels) ? layoutData.channels : [],
      active_widgets: Array.isArray(layoutData.activeWidgets) ? layoutData.activeWidgets : [],
      preferences: layoutData.preferences || {},
      user_email: userEmail,
      updated_at: new Date().toISOString()
    };

    if (client) {
      try {
        // 1. Try helper RPC function if exists
        try {
          const { data: rpcData, error: rpcError } = await client.rpc('save_complete_user_layout', {
            p_user_id: userId,
            p_layout_type: payload.layout_type,
            p_channels: payload.channels,
            p_active_widgets: payload.active_widgets,
            p_preferences: payload.preferences,
            p_user_email: userEmail
          });
          if (!rpcError && rpcData) {
            return { success: true, data: rpcData };
          }
        } catch (e) {}

        // 2. Direct upsert on user_layouts table
        const { data, error } = await client
          .from('user_layouts')
          .upsert(payload, { onConflict: 'user_id' });

        if (error) {
          const updateRes = await client.from('user_layouts').update(payload).eq('user_id', userId);
          if (updateRes.error) {
            await client.from('user_layouts').insert(payload);
          }
        }
        return { success: true, data };
      } catch (e) {
        console.warn('[Supabase saveUserLayout client exception]', e);
      }
    }

    // Direct REST Fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;
    try {
      const resp = await fetch(`${url}/rest/v1/user_layouts?on_conflict=user_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return { success: resp.ok };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Load User Panel Layout from Supabase with multi-platform resolution
   */
  async loadUserLayout(userId, email = null, twitchLogin = null, kickUsername = null) {
    const client = this.getClient();
    let targetUserId = userId;
    const cleanEmail = (email || this.getCurrentUser()?.email || '').trim().toLowerCase();

    // If userId not provided, try to resolve from profile lookup
    if (!targetUserId && (cleanEmail || twitchLogin || kickUsername)) {
      try {
        if (cleanEmail) {
          const p = await this.loadLinkedAccounts(null, cleanEmail);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
        if (!targetUserId && twitchLogin) {
          const p = await this.findProfileByPlatform('twitch', twitchLogin);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
        if (!targetUserId && kickUsername) {
          const p = await this.findProfileByPlatform('kick', kickUsername);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
      } catch (e) {}
    }

    if (!targetUserId && !cleanEmail) return { success: false };

    if (client) {
      try {
        // 1. Try lookup by user_id
        if (targetUserId) {
          const { data, error } = await client
            .from('user_layouts')
            .select('*')
            .eq('user_id', targetUserId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data && Array.isArray(data.channels) && data.channels.length > 0) {
            return { success: true, layout: data };
          }
        }

        // 2. Try lookup by user_email
        if (cleanEmail) {
          const { data, error } = await client
            .from('user_layouts')
            .select('*')
            .eq('user_email', cleanEmail)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            return { success: true, layout: data };
          }
        }
      } catch (e) {
        console.warn('[Supabase loadUserLayout client exception]', e);
      }
    }

    // Direct REST Fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;
    try {
      if (targetUserId) {
        const resp = await fetch(`${url}/rest/v1/user_layouts?user_id=eq.${targetUserId}&select=*&order=updated_at.desc&limit=1`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].channels) && data[0].channels.length > 0) {
          return { success: true, layout: data[0] };
        }
      }
      if (cleanEmail) {
        const resp = await fetch(`${url}/rest/v1/user_layouts?user_email=eq.${cleanEmail}&select=*&order=updated_at.desc&limit=1`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, layout: data[0] };
        }
      }
    } catch (e) {
      return { success: false, error: e.message };
    }

    return { success: false };
  }

  /**
   * Save Moderated Channel History in Supabase
   */
  async saveChannelHistory(userId, historyItems, email = null) {
    if (!userId || !Array.isArray(historyItems) || historyItems.length === 0) return { success: false };
    const client = this.getClient();
    const userEmail = email || this.getCurrentUser()?.email || null;

    const rows = historyItems.map(item => ({
      user_id: userId,
      channel_id: item.id || `ch-${item.platform}-${item.name}`,
      name: item.name,
      platform: item.platform,
      role: item.role || (item.isModerator ? 'mod' : 'viewer'),
      avatar: item.avatar || '',
      user_email: userEmail,
      added_at: item.addedAt ? new Date(item.addedAt).toISOString() : new Date().toISOString()
    }));

    if (client) {
      try {
        const { data, error } = await client
          .from('channel_history')
          .upsert(rows, { onConflict: 'user_id,channel_id' });

        if (!error) return { success: true, data };
        console.warn('[Supabase saveChannelHistory upsert warn]', error);
      } catch (e) {
        console.warn('[Supabase saveChannelHistory exception]', e);
      }
    }

    // Direct REST Fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;
    try {
      const resp = await fetch(`${url}/rest/v1/channel_history?on_conflict=user_id,channel_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(rows)
      });
      return { success: resp.ok };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Load Moderated Channel History from Supabase
   */
  async loadChannelHistory(userId, email = null, twitchLogin = null, kickUsername = null) {
    let targetUserId = userId;

    if (!targetUserId && (email || twitchLogin || kickUsername)) {
      try {
        if (email) {
          const p = await this.loadLinkedAccounts(null, email);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
        if (!targetUserId && twitchLogin) {
          const p = await this.findProfileByPlatform('twitch', twitchLogin);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
        if (!targetUserId && kickUsername) {
          const p = await this.findProfileByPlatform('kick', kickUsername);
          if (p.success && p.profile?.id) targetUserId = p.profile.id;
        }
      } catch (e) {}
    }

    if (!targetUserId) return { success: false, channels: [] };
    const client = this.getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('channel_history')
          .select('*')
          .eq('user_id', targetUserId)
          .order('added_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return { success: true, channels: data };
        }
      } catch (e) {
        console.warn('[Supabase loadChannelHistory exception]', e);
      }
    }

    // Direct REST Fallback
    const url = this.supabaseConfig.url || DEFAULT_SUPABASE_URL;
    const key = this.supabaseConfig.anonKey || DEFAULT_SUPABASE_KEY;
    try {
      const resp = await fetch(`${url}/rest/v1/channel_history?user_id=eq.${targetUserId}&order=added_at.desc&select=*`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      const data = await resp.json();
      if (Array.isArray(data)) {
        return { success: true, channels: data };
      }
      return { success: false, channels: [] };
    } catch (e) {
      return { success: false, channels: [] };
    }
  }

  /**
   * Check if a Twitch or Kick account is already linked to another Master Email Account
   */
  async checkAccountConflict(platform, username, currentUserId) {
    if (!username) return { hasConflict: false };
    const client = this.getClient();
    if (!client) return { hasConflict: false };

    const cleanUser = username.toLowerCase().replace(/[@#]/g, '').trim();
    const col = platform === 'twitch' ? 'twitch_login' : 'kick_username';

    try {
      let query = client.from('profiles').select('id, email, username').ilike(col, cleanUser);
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
        const owner = data[0];
        const platformName = platform === 'twitch' ? 'Twitch' : 'Kick';
        const maskedEmail = owner.email ? (owner.email.substring(0, 3) + '***@' + owner.email.split('@')[1]) : 'otra cuenta';
        return {
          hasConflict: true,
          ownerId: owner.id,
          ownerEmail: owner.email,
          ownerUsername: owner.username,
          error: `🚫 La cuenta de ${platformName} (@${username}) ya está vinculada a otro correo electronico.`
        };
      }
      return { hasConflict: false };
    } catch (e) {
      console.warn('[Supabase checkAccountConflict error]', e);
      return { hasConflict: false };
    }
  }

  /**
   * Save Linked Accounts (Twitch, Kick) to Master Supabase Profile with Security Validation
   */
  async saveLinkedAccounts(userId, { twitch, kick, email, username, avatar }) {
    if (!userId) return { success: false };
    const client = this.getClient();
    if (!client) return { success: false };

    // 0. Conflict Validation: Prevent stealing already-linked accounts
    if (twitch && (twitch.login || twitch.username)) {
      const conflictTwitch = await this.checkAccountConflict('twitch', twitch.login || twitch.username, userId);
      if (conflictTwitch.hasConflict) {
        return { success: false, conflict: true, error: conflictTwitch.error };
      }
    }

    if (kick && (kick.username || kick.login)) {
      const conflictKick = await this.checkAccountConflict('kick', kick.username || kick.login, userId);
      if (conflictKick.hasConflict) {
        return { success: false, conflict: true, error: conflictKick.error };
      }
    }

    const user = this.getCurrentUser();
    const payload = {
      id: userId,
      email: email || user?.email || null,
      username: username || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Usuario'),
      avatar_url: avatar || user?.avatar || null,
      updated_at: new Date().toISOString()
    };

    if (twitch !== undefined) {
      payload.twitch_login = twitch ? (twitch.login || twitch.username) : null;
    }
    if (kick !== undefined) {
      payload.kick_username = kick ? (kick.username || kick.login) : null;
    }

    try {
      // 1. Try Upsert with onConflict on id
      const { data, error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[Supabase saveLinkedAccounts upsert warning, trying update/insert fallback]', error);
        const updateRes = await client.from('profiles').update(payload).eq('id', userId);
        if (updateRes.error) {
          await client.from('profiles').insert(payload);
        }
      }

      // 2. Propagate to any other identity rows sharing the same email (Google OAuth & Email/Pass synchronization)
      const targetEmail = (payload.email || '').trim().toLowerCase();
      if (targetEmail) {
        try {
          await client.from('profiles').update({
            twitch_login: payload.twitch_login,
            kick_username: payload.kick_username,
            updated_at: new Date().toISOString()
          }).ilike('email', targetEmail);
        } catch (e) {}
      }

      return { success: true, data };
    } catch (e) {
      console.warn('[Supabase saveLinkedAccounts exception]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Load Linked Accounts from Master Supabase Profile with Deep Multi-Identity Resolution
   */
  async loadLinkedAccounts(userId, email = null) {
    const client = this.getClient();
    if (!client) return { success: false };

    try {
      let allProfiles = [];

      // 1. Fetch by user ID
      if (userId) {
        const { data } = await client.from('profiles').select('*').eq('id', userId);
        if (Array.isArray(data)) allProfiles.push(...data);
      }

      // 2. Fetch by Email (case-insensitive)
      const targetEmail = (email || this.getCurrentUser()?.email || '').trim().toLowerCase();
      if (targetEmail) {
        const { data } = await client.from('profiles').select('*').ilike('email', targetEmail);
        if (Array.isArray(data)) {
          data.forEach(d => {
            if (!allProfiles.some(p => p.id === d.id)) allProfiles.push(d);
          });
        }
      }

      // 3. Fallback to Master Hub if database rows are isolated by Supabase RLS
      const localHub = (typeof window !== 'undefined' && window.localStorage)
        ? JSON.parse(window.localStorage.getItem('orbimod_master_hub_v2') || '{}')
        : {};

      const merged = {
        twitch_login: null,
        kick_username: null,
        email: targetEmail || (allProfiles[0]?.email) || localHub.google?.email,
        username: allProfiles[0]?.username || localHub.google?.displayName || 'Usuario',
        avatar_url: allProfiles[0]?.avatar_url || localHub.google?.avatar || null
      };

      for (const p of allProfiles) {
        if (p.twitch_login && !merged.twitch_login) merged.twitch_login = p.twitch_login;
        if (p.kick_username && !merged.kick_username) merged.kick_username = p.kick_username;
        if (p.avatar_url && !merged.avatar_url) merged.avatar_url = p.avatar_url;
        if (p.username && (!merged.username || merged.username === 'Usuario')) merged.username = p.username;
      }

      // If Supabase didn't have twitch/kick yet for this row, merge from master hub!
      if (!merged.twitch_login && localHub.twitch?.login) {
        merged.twitch_login = localHub.twitch.login;
      }
      if (!merged.kick_username && localHub.kick?.username) {
        merged.kick_username = localHub.kick.username;
      }

      if (!merged.twitch_login && !merged.kick_username && allProfiles.length === 0) {
        return { success: false };
      }

      // 4. Automatically populate / sync this user ID's profile row in Supabase
      if (userId && (merged.twitch_login || merged.kick_username)) {
        try {
          await this.saveLinkedAccounts(userId, {
            twitch: merged.twitch_login ? { login: merged.twitch_login, valid: true } : null,
            kick: merged.kick_username ? { username: merged.kick_username, valid: true } : null,
            email: merged.email,
            username: merged.username,
            avatar: merged.avatar_url
          });
        } catch (e) {}
      }

      return { success: true, profile: merged };
    } catch (e) {
      console.warn('[Supabase loadLinkedAccounts error]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Find Master Profile in Supabase by Linked Platform Username
   */
  async findProfileByPlatform(platform, username) {
    if (!username) return { success: false };
    const client = this.getClient();
    if (!client) return { success: false };

    const cleanUser = username.toLowerCase().replace(/[@#]/g, '');
    try {
      const col = platform === 'twitch' ? 'twitch_login' : 'kick_username';
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .ilike(col, cleanUser)
        .maybeSingle();

      if (error || !data) return { success: false };
      return { success: true, profile: data };
    } catch (e) {
      return { success: false };
    }
  }

  /**
   * Configure Custom Supabase Credentials
   */
  configureSupabase(url, anonKey) {
    if (!url || !anonKey) {
      this._saveConfig({ url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_KEY, isConfigured: true });
      return { success: true, message: 'Configuración restaurada a los valores predeterminados de Supabase.' };
    }
    this._saveConfig({
      url: url.trim().replace(/\/$/, ''),
      anonKey: anonKey.trim(),
      isConfigured: true
    });
    return { success: true, message: '¡Credenciales de Supabase configuradas con éxito!' };
  }

  /**
   * Sign Out from Supabase
   */
  async signOut() {
    const client = this.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) { }
    }
    this._saveSession(null);
    return { success: true };
  }
}

export const supabaseAuthService = new SupabaseAuthService();
