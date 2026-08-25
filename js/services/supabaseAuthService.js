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
  async saveUserLayout(userId, layoutData) {
    if (!userId || !layoutData) return { success: false };
    const client = this.getClient();
    if (!client) return { success: false };

    try {
      const { data, error } = await client
        .from('user_layouts')
        .upsert({
          user_id: userId,
          layout_type: layoutData.layoutType || 'grid-4',
          channels: layoutData.channels || [],
          active_widgets: layoutData.activeWidgets || [],
          preferences: layoutData.preferences || {},
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.warn('[Supabase saveUserLayout error]', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e) {
      console.warn('[Supabase saveUserLayout exception]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Load User Panel Layout from Supabase
   */
  async loadUserLayout(userId) {
    if (!userId) return { success: false };
    const client = this.getClient();
    if (!client) return { success: false };

    try {
      const { data, error } = await client
        .from('user_layouts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase loadUserLayout error]', error);
        return { success: false, error: error.message };
      }
      return { success: true, layout: data };
    } catch (e) {
      console.warn('[Supabase loadUserLayout exception]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Save Moderated Channel History in Supabase
   */
  async saveChannelHistory(userId, historyItems) {
    if (!userId || !Array.isArray(historyItems)) return { success: false };
    const client = this.getClient();
    if (!client) return { success: false };

    try {
      const rows = historyItems.map(item => ({
        user_id: userId,
        channel_id: item.id,
        name: item.name,
        platform: item.platform,
        role: item.role || 'mod',
        avatar: item.avatar || '',
        added_at: item.addedAt ? new Date(item.addedAt).toISOString() : new Date().toISOString()
      }));

      const { data, error } = await client
        .from('channel_history')
        .upsert(rows, { onConflict: 'user_id,channel_id' });

      if (error) {
        console.warn('[Supabase saveChannelHistory error]', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e) {
      console.warn('[Supabase saveChannelHistory exception]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Load Moderated Channel History from Supabase
   */
  async loadChannelHistory(userId) {
    if (!userId) return { success: false, channels: [] };
    const client = this.getClient();
    if (!client) return { success: false, channels: [] };

    try {
      const { data, error } = await client
        .from('channel_history')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.warn('[Supabase loadChannelHistory error]', error);
        return { success: false, channels: [] };
      }
      return { success: true, channels: data || [] };
    } catch (e) {
      console.warn('[Supabase loadChannelHistory exception]', e);
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
