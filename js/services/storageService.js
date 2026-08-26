/**
 * NEXUS MOD DECK — LOCAL STORAGE & STATE PERSISTENCE SERVICE
 */

import { DEFAULT_CHANNELS, DEFAULT_MACROS } from '../data/defaultMacros.js';

const STORAGE_KEYS = {
  CHANNELS: 'nexus_mod_channels_v1',
  CHANNEL_HISTORY: 'nexus_mod_channel_history_v1',
  SETTINGS: 'nexus_mod_settings_v1',
  MACROS: 'nexus_mod_macros_v1',
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

  // Moderated Channel History
  getChannelHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHANNEL_HISTORY);
      if (data) return JSON.parse(data);
      return this.getChannels();
    } catch (e) {
      return [];
    }
  }

  saveChannelHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHANNEL_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save channel history', e);
    }
  }

  addToHistory(channel) {
    if (!channel || !channel.name) return;
    const history = this.getChannelHistory();
    const cleanName = (channel.name || '').toLowerCase();
    const existingIndex = history.findIndex(c => c && c.name && c.name.toLowerCase() === cleanName && c.platform === channel.platform);
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...channel, lastUsed: Date.now() };
    } else {
      history.unshift({ ...channel, lastUsed: Date.now() });
    }
    this.saveChannelHistory(history);
    return history;
  }

  removeFromHistory(channelId) {
    let history = this.getChannelHistory();
    history = history.filter(c => c.id !== channelId);
    this.saveChannelHistory(history);
    return history;
  }

  clearHistory() {
    this.saveChannelHistory([]);
    return [];
  }

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : {};
      return {
        layout: parsed.layout || 'layout-grid-2x2',
        soundEnabled: parsed.soundEnabled ?? true,
        volume: parsed.volume ?? 0.5,
        theme: parsed.theme || 'cyber-dark',
        fontSize: parsed.fontSize || 'normal',
        shieldActive: false,
        demoMode: false
      };
    } catch (e) {
      return { layout: 'layout-grid-2x2', soundEnabled: true, volume: 0.5, theme: 'cyber-dark', fontSize: 'normal', shieldActive: false, demoMode: false };
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

  // =========================================================================
  // MASTER UNIFIED IDENTITY HUB (Persistent Link between Google, Twitch, Kick)
  // =========================================================================
  getMasterHub() {
    try {
      const d = localStorage.getItem('orbimod_master_hub_v2');
      return d ? JSON.parse(d) : { google: null, twitch: null, kick: null };
    } catch (e) {
      return { google: null, twitch: null, kick: null };
    }
  }

  saveMasterHub(hub) {
    try {
      localStorage.setItem('orbimod_master_hub_v2', JSON.stringify(hub));
    } catch (e) {}
  }

  updateMasterHubField(platform, data) {
    const hub = this.getMasterHub();
    hub[platform] = data;
    this.saveMasterHub(hub);
  }

  unlinkFromMasterHub(platform) {
    const hub = this.getMasterHub();
    hub[platform] = null;
    this.saveMasterHub(hub);
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
