/**
 * ORBIMOD — SUPABASE & EMAIL AUTHENTICATION SERVICE
 * Manages email/password authentication, persistent user sessions,
 * and provides ready-to-configure integration hooks for Supabase.
 */

const STORAGE_KEY_AUTH = 'orbimod_email_session_v1';
const STORAGE_KEY_CONFIG = 'orbimod_supabase_config_v1';

class SupabaseAuthService {
  constructor() {
    this.session = this._loadSession();
    this.supabaseConfig = this._loadConfig();
    this.listeners = [];
  }

  _loadConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      return data ? JSON.parse(data) : {
        url: '',
        anonKey: '',
        isConfigured: false
      };
    } catch (e) {
      return { url: '', anonKey: '', isConfigured: false };
    }
  }

  _saveConfig(config) {
    this.supabaseConfig = { ...this.supabaseConfig, ...config };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.supabaseConfig));
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

  /**
   * Login with Email & Password
   */
  async signInWithPassword(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Por favor ingresa tu correo y contraseña.' };
    }

    // If Supabase is configured with custom URL/Key:
    if (this.supabaseConfig.isConfigured && this.supabaseConfig.url && this.supabaseConfig.anonKey) {
      try {
        const response = await fetch(`${this.supabaseConfig.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey
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

    // Default Local Session Fallback (Ready before user inputs Supabase keys)
    await new Promise(resolve => setTimeout(resolve, 400));
    const username = email.split('@')[0];
    const session = {
      accessToken: 'local-token-' + Date.now(),
      user: {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: email,
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
      }
    };

    this._saveSession(session);
    return { success: true, user: session.user };
  }

  /**
   * Register with Email & Password
   */
  async signUp(email, password, displayName = '') {
    if (!email || !password) {
      return { success: false, error: 'Por favor ingresa un correo y contraseña válida.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const username = displayName.trim() || email.split('@')[0];

    // If Supabase is configured:
    if (this.supabaseConfig.isConfigured && this.supabaseConfig.url && this.supabaseConfig.anonKey) {
      try {
        const response = await fetch(`${this.supabaseConfig.url}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey
          },
          body: JSON.stringify({
            email,
            password,
            data: { display_name: username }
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

    // Default Local Session
    await new Promise(resolve => setTimeout(resolve, 400));
    const session = {
      accessToken: 'local-token-' + Date.now(),
      user: {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: email,
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
      }
    };

    this._saveSession(session);
    return { success: true, user: session.user };
  }

  /**
   * Configure Supabase Credentials
   */
  configureSupabase(url, anonKey) {
    if (!url || !anonKey) {
      this._saveConfig({ url: '', anonKey: '', isConfigured: false });
      return { success: true, message: 'Configuración de Supabase reseteada a modo local.' };
    }
    this._saveConfig({
      url: url.trim().replace(/\/$/, ''),
      anonKey: anonKey.trim(),
      isConfigured: true
    });
    return { success: true, message: '¡Credenciales de Supabase configuradas con éxito!' };
  }

  /**
   * Sign Out
   */
  async signOut() {
    this._saveSession(null);
    return { success: true };
  }
}

export const supabaseAuthService = new SupabaseAuthService();
