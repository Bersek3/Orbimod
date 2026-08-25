/**
 * NEXUS MOD DECK — LOCAL STORAGE & STATE PERSISTENCE SERVICE
 */

import { DEFAULT_CHANNELS, DEFAULT_MACROS } from '../data/defaultMacros.js';

const STORAGE_KEYS = {
  CHANNELS: 'nexus_mod_channels_v1',
  SETTINGS: 'nexus_mod_settings_v1',
  MACROS: 'nexus_mod_macros_v1',
  AUTOMOD_RULES: 'nexus_mod_automod_v1',
  USER_NOTES: 'nexus_mod_user_notes_v1',
  USER_HISTORY: 'nexus_mod_user_history_v1',
  AUDIT_LOGS: 'nexus_mod_audit_logs_v1',
  AUTH_CREDS: 'nexus_mod_auth_creds_v1',
  USER_PROFILES: 'nexus_mod_profiles_v1'
};

class StorageService {
  // Channels
  getChannels() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHANNELS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveChannels(channels) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
    } catch (e) {
      console.error('Failed to save channels', e);
    }
  }

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        layout: 'layout-grid-2x2',
        soundEnabled: true,
        volume: 0.5,
        theme: 'cyber-dark',
        fontSize: 'normal',
        shieldActive: false,
        demoMode: true
      };
    } catch (e) {
      return { layout: 'layout-grid-2x2', soundEnabled: true, volume: 0.5, theme: 'cyber-dark', fontSize: 'normal', shieldActive: false, demoMode: true };
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // Macros
  getMacros() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MACROS);
      return data ? JSON.parse(data) : DEFAULT_MACROS;
    } catch (e) {
      return DEFAULT_MACROS;
    }
  }

  saveMacros(macros) {
    try {
      localStorage.setItem(STORAGE_KEYS.MACROS, JSON.stringify(macros));
    } catch (e) {
      console.error('Failed to save macros', e);
    }
  }

  // AutoMod Rules & Blacklist
  getAutoModConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTOMOD_RULES);
      return data ? JSON.parse(data) : {
        enabled: true,
        blockLinks: true,
        linkWhitelist: ['twitch.tv', 'kick.com', 'youtube.com', 'discord.gg', 'twitter.com', 'x.com', 'spotify.com'],
        blacklistWords: ['free nitro', 'viewbot', 'cheap followers', 't.me/', 'discord.gg/scam', 'hack', 'buy followers', 'f*ck', 'nazi', 'doxx'],
        capsThreshold: 70, // percentage
        minCapsLength: 10,
        repeatThreshold: 6, // consecutive repeated characters
        actionOnMatch: 'flag' // 'flag', 'timeout_600', 'delete', 'ban'
      };
    } catch (e) {
      return {
        enabled: true,
        blockLinks: true,
        linkWhitelist: ['twitch.tv', 'kick.com', 'youtube.com', 'discord.gg'],
        blacklistWords: ['free nitro', 'viewbot', 'cheap followers', 't.me/'],
        capsThreshold: 70,
        minCapsLength: 10,
        repeatThreshold: 6,
        actionOnMatch: 'flag'
      };
    }
  }

  saveAutoModConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMOD_RULES, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save automod rules', e);
    }
  }

  // User Mod Notes
  getUserNotes(userId) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_NOTES);
      const notes = data ? JSON.parse(data) : {};
      return notes[userId] || [];
    } catch (e) {
      return [];
    }
  }

  addUserNote(userId, note) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_NOTES);
      const notes = data ? JSON.parse(data) : {};
      if (!notes[userId]) notes[userId] = [];
      notes[userId].unshift({
        id: 'note-' + Date.now(),
        text: note.text,
        author: note.author || 'Tú (Mod)',
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.USER_NOTES, JSON.stringify(notes));
      return notes[userId];
    } catch (e) {
      console.error('Failed to save user note', e);
      return [];
    }
  }

  // User Sanction History
  getUserHistory(userId) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_HISTORY);
      const history = data ? JSON.parse(data) : {};
      return history[userId] || [];
    } catch (e) {
      return [];
    }
  }

  addUserSanction(userId, sanction) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_HISTORY);
      const history = data ? JSON.parse(data) : {};
      if (!history[userId]) history[userId] = [];
      history[userId].unshift({
        id: 'sanction-' + Date.now(),
        type: sanction.type, // 'timeout', 'ban', 'delete', 'warn'
        duration: sanction.duration || null,
        reason: sanction.reason || 'Sin motivo especificado',
        channel: sanction.channel,
        mod: sanction.mod || 'Tú',
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.USER_HISTORY, JSON.stringify(history));
      return history[userId];
    } catch (e) {
      console.error('Failed to save user sanction', e);
      return [];
    }
  }

  // Audit Logs
  getAuditLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  addAuditLog(entry) {
    try {
      const logs = this.getAuditLogs();
      logs.unshift({
        id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        action: entry.action, // 'TIMEOUT', 'BAN', 'UNBAN', 'DELETE', 'MODE_CHANGE', 'SHIELD'
        targetUser: entry.targetUser || null,
        channel: entry.channel,
        platform: entry.platform || 'twitch',
        mod: entry.mod || 'Tú (Lead Mod)',
        details: entry.details || '',
        timestamp: new Date().toISOString()
      });
      // Keep last 300 logs
      const trimmed = logs.slice(0, 300);
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
      return trimmed[0];
    } catch (e) {
      console.error('Failed to save audit log', e);
      return null;
    }
  }

  clearAuditLogs() {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    } catch (e) {}
  }

  // Auth Credentials
  getAuthCreds() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_CREDS);
      return data ? JSON.parse(data) : {
        twitchToken: '',
        twitchUsername: '',
        kickApiKey: '',
        kickUsername: ''
      };
    } catch (e) {
      return { twitchToken: '', twitchUsername: '', kickApiKey: '', kickUsername: '' };
    }
  }

  saveAuthCreds(creds) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_CREDS, JSON.stringify(creds));
    } catch (e) {
      console.error('Failed to save auth creds', e);
    }
  }

  // Profiles
  getProfiles() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
      return data ? JSON.parse(data) : { twitch: null, kick: null };
    } catch (e) {
      return { twitch: null, kick: null };
    }
  }

  saveProfiles(profiles) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles', e);
    }
  }

  clearAuth() {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_CREDS);
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILES);
      localStorage.removeItem(STORAGE_KEYS.CHANNELS);
    } catch (e) {
      console.error('Failed to clear auth in storage', e);
    }
  }
}

export const storageService = new StorageService();
