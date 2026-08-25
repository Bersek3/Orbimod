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
    } catch (e) {}

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
      } catch (e) {}
    }
    this._saveSession(null);
    return { success: true };
  }
}

export const supabaseAuthService = new SupabaseAuthService();
