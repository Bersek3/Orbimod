/**
 * ORBIMOD — MAIN APPLICATION CONTROLLER
 * Orchestrates real-time connections, multi-channel deck, AutoMod, and drawers
 */

import { storageService } from './services/storageService.js';
import { soundService } from './services/soundService.js';
import { automodService } from './services/automodService.js';
import { apiService } from './services/apiService.js';
import { TwitchClient } from './connection/twitch.js';
import { KickClient } from './connection/kick.js';
import { LiveSimulator } from './connection/simulator.js';
import { ChannelCard } from './components/channelCard.js';
import { UserInspectorDrawer } from './components/userInspector.js';
import { AutoModQueueDrawer } from './components/automodQueue.js';
import { AuditLogDrawer } from './components/auditLog.js';
import { EventRadarDrawer } from './components/eventRadar.js';
import { MacroManagerModal } from './components/macroManager.js';
import { ManageChannelsModal, AddChannelModal, AutoModSettingsModal, ConnectionHubModal, HotkeysModal, UnifiedAuthModal } from './components/modals.js';
import { ChannelSearchHistoryBar } from './components/channelSearchHistoryBar.js';
import { supabaseAuthService } from './services/supabaseAuthService.js';

class OrbiModApp {
  constructor() {
    this.currentView = 'landing'; // 'landing' | 'deck'
    this.channels = storageService.getChannels() || []; // active in deck
    this.searchHistoryBar = null;
    this.settings = storageService.getSettings();
    this.channelCards = new Map(); // id -> ChannelCard instance
    this.selectedLayout = this.settings.layout || 'layout-grid-2x2';

    // Metrics state
    this.totalMessagesCount = 0;
    this.uniqueChatters = new Set();
    this.msgVelocityTimer = null;
    this.msgVelocity = 0;
    this.recentMsgCount = 0;

    // Initialize Drawers & Modals
    this.inspectorDrawer = new UserInspectorDrawer(
      document.getElementById('user-inspector-drawer'),
      {
        onTimeout: (ch, user, dur) => this.handleTimeout(ch, user, dur, 'Sancionado desde Inspector'),
        onBan: (ch, user) => this.handleBan(ch, user, 'Baneado desde Inspector'),
        onUnban: (ch, user) => this.handleUnban(ch, user)
      }
    );

    this.automodDrawer = new AutoModQueueDrawer(
      document.getElementById('automod-queue-drawer'),
      {
        onApprove: (item) => {
          this.showToast(`Mensaje de @${item.username} aprobado`, 'success');
          const card = this.channelCards.get(`ch-${item.channel}`) || Array.from(this.channelCards.values()).find(c => c.channel.name.toLowerCase() === item.channel.toLowerCase());
          if (card) {
            card.addMessage({
              id: item.messageId,
              platform: item.platform,
              channel: item.channel,
              username: item.username,
              displayName: item.displayName,
              color: item.color,
              badges: item.badges,
              text: item.text,
              timestamp: item.timestamp,
              isMod: false,
              isSub: false,
              isVip: false
            });
          }
        },
        onReject: (item) => {
          this.handleDelete({ name: item.channel, platform: item.platform }, { id: item.messageId, username: item.username, text: item.text }, 'Rechazado por AutoMod');
        },
        onTimeout: (item, dur) => {
          this.handleTimeout({ name: item.channel, platform: item.platform }, { username: item.username }, dur, item.reason);
        },
        onBan: (item) => {
          this.handleBan({ name: item.channel, platform: item.platform }, { username: item.username }, item.reason);
        },
        onOpenSettings: () => {
          this.automodDrawer.close();
          this.automodSettingsModal.open();
        }
      }
    );

    this.auditLogDrawer = new AuditLogDrawer(document.getElementById('audit-log-drawer'));

    this.eventRadarDrawer = new EventRadarDrawer(
      document.getElementById('event-radar-drawer'),
      {
        onToggleShield: (active) => this.handleShieldToggle(active),
        onSimulateRaid: () => {
          if (this.channels.length > 0) {
            this.simulator.triggerManualRaid(this.channels[0].name);
          }
        }
      }
    );

    this.showOnlyLive = true;

    this.manageChannelsModal = new ManageChannelsModal(
      document.getElementById('generic-modal'),
      {
        getChannels: () => this.channels,
        onAddChannel: (chan) => this.addChannel(chan),
        onRemoveChannel: (id) => this.removeChannel(id),
        onRefreshLive: async () => {
          await this.refreshChannelsLiveStatus();
        },
        onScanChannels: async () => {
          const profiles = storageService.getProfiles();
          if (!profiles.twitch || !profiles.twitch.token) {
            this.showToast('Primero inicia sesión con Twitch', 'warning');
            return;
          }
          this.showToast('⚡ Escaneando canales moderados en Twitch...', 'twitch');
          const res = await apiService.fetchModeratedChannels(profiles.twitch.token, profiles.twitch.clientId, profiles.twitch.userId);
          if (res.success && res.channels.length > 0) {
            res.channels.forEach(ch => {
              const login = (ch.name || ch.broadcaster_login || '').toLowerCase();
              if (login && !this.channels.some(c => c.name.toLowerCase() === login && c.platform === 'twitch')) {
                this.addChannel({
                  id: `ch-twitch-${login}`,
                  name: login,
                  displayName: ch.displayName || login,
                  platform: 'twitch',
                  avatar: ch.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
                  viewers: 0,
                  isLive: true,
                  videoEnabled: true,
                  slowMode: 0,
                  subOnly: false,
                  followOnly: false,
                  emoteOnly: false
                });
              }
            });
            await this.refreshChannelsLiveStatus();
            this.showToast(`¡Se agregaron ${res.channels.length} canales moderados!`, 'success');
          } else {
            this.showToast('No se encontraron canales donde seas moderador', 'info');
          }
        },
        onClearChannels: () => {
          [...this.channels].forEach(ch => this.removeChannel(ch.id));
          this.showToast('Todos los canales fueron quitados del Deck', 'info');
        }
      }
    );

    this.automodSettingsModal = new AutoModSettingsModal(
      document.getElementById('generic-modal'),
      () => this.showToast('Reglas de AutoMod actualizadas', 'success')
    );

    this.hotkeysModal = new HotkeysModal(document.getElementById('generic-modal'));

    this.unifiedAuthModal = new UnifiedAuthModal(
      document.getElementById('generic-modal'),
      (loginRes) => this.handleUnifiedLoginSuccess(loginRes)
    );

    // Clients
    this.twitchClient = new TwitchClient(
      (msg) => this.handleIncomingMessage(msg),
      (action) => this.handlePlatformModAction(action),
      (status) => this.updateConnectionPill('twitch', status)
    );

    this.kickClient = new KickClient(
      (msg) => this.handleIncomingMessage(msg),
      (action) => this.handlePlatformModAction(action),
      (status) => this.updateConnectionPill('kick', status)
    );

    this.simulator = new LiveSimulator(
      (msg) => this.handleIncomingMessage(msg),
      (ev) => this.eventRadarDrawer.addEvent(ev)
    );
  }

  async init() {
    this._bindHeaderControls();
    this._bindLandingControls();
    this._bindKeyboardShortcuts();
    this._startVelocityMeter();
    this._setupAutoModListener();

    // Sound toggle init & background keep-alive
    soundService.toggleSound(this.settings.soundEnabled);
    this._updateSoundBtnVisual(this.settings.soundEnabled);

    // Initialize Top Bar Channel Search & Moderated History Component
    this.searchHistoryBar = new ChannelSearchHistoryBar({
      container: document.getElementById('deck-channel-search-container'),
      getActiveChannels: () => this.channels,
      onAddChannel: (chan) => {
        this.addChannel(chan);
      },
      onRemoveChannel: (id) => {
        this.removeChannel(id);
      },
      onChannelsUpdated: () => {
        this.renderChannels();
      },
      showToast: (msg, type) => this.showToast(msg, type)
    });

    // Keep streams active in background tabs without pausing
    const startKeepAlive = () => {
      soundService.startBackgroundPlaybackKeepAlive();
    };
    document.addEventListener('click', startKeepAlive, { once: true });
    document.addEventListener('keydown', startKeepAlive, { once: true });

    // Apply layout
    this.setLayout(this.selectedLayout);

    // Check URL hash / params for OAuth redirect
    const didAuth = await this._checkOAuthRedirect();
    this.updateLandingAuthStatus();

    const savedView = localStorage.getItem('orbimod_active_view');
    const hash = window.location.hash.toLowerCase();

    if (didAuth || hash === '#deck' || savedView === 'deck') {
      soundService.startBackgroundPlaybackKeepAlive();
      this.switchView('deck');
    } else {
      this.switchView('landing');
    }

    this.showToast('OrbiMod listo', 'success');
  }

  async _checkOAuthRedirect() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');

      if (accessToken) {
        this.showToast('🟣 Procesando autenticación oficial de Twitch...', 'twitch');
        const validation = await apiService.validateTwitchToken(accessToken);

        if (validation.valid) {
          const userProfile = await apiService.fetchTwitchUserProfile(validation.token, validation.clientId);
          const profiles = storageService.getProfiles();
          profiles.twitch = {
            valid: true,
            login: validation.login,
            userId: validation.userId,
            clientId: validation.clientId,
            token: validation.token,
            scopes: validation.scopes,
            avatar: userProfile ? userProfile.profile_image_url : ''
          };
          storageService.saveProfiles(profiles);

          const creds = storageService.getAuthCreds();
          creds.twitchToken = validation.token;
          creds.twitchUsername = validation.login;
          storageService.saveAuthCreds(creds);

          // Clean URL hash without reloading
          window.history.replaceState(null, null, window.location.pathname);
          this.showToast(`¡Cuenta de Twitch vinculada con éxito como @${validation.login}!`, 'success');

          // Auto-fetch moderated channels!
          const modRes = await apiService.fetchModeratedChannels(validation.token, validation.clientId, validation.userId);
          if (modRes.success && modRes.channels.length > 0) {
            modRes.channels.forEach(ch => {
              const login = (ch.name || ch.broadcaster_login || '').toLowerCase();
              const displayName = ch.displayName || ch.broadcaster_name || ch.name || login;
              if (!login) return;

              const id = `ch-twitch-${login}`;
              const exists = this.channels.some(c => c && c.name && c.name.toLowerCase() === login);
              if (!exists) {
                this.channels.push({
                  id: id,
                  name: login,
                  displayName: displayName,
                  platform: 'twitch',
                  isModerator: true,
                  videoEnabled: true,
                  role: 'mod',
                  avatar: ch.avatar || ''
                });
              }
            });
            storageService.saveChannels(this.channels);
            this.showToast(`⚡ Se sincronizaron ${modRes.channels.length} canales moderados en Twitch`, 'success');
          }
          return true;
        }
      }
    }

    // 2. Check URL search params for Kick OAuth redirect (?code=... or ?kick_token=...)
    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const kickCode = urlParams.get('code') || urlParams.get('kick_code');
      const kickUser = urlParams.get('username') || urlParams.get('kick_user') || 'kick_moderator';

      if (kickCode) {
        this.showToast('🟢 Procesando autenticación de Kick Developer OAuth 2.0...', 'success');

        const tokenRes = await apiService.exchangeKickAuthCode(kickCode);
        const accessToken = tokenRes.success && tokenRes.tokenData?.access_token ? tokenRes.tokenData.access_token : kickCode;

        const profiles = storageService.getProfiles();
        profiles.kick = {
          valid: true,
          username: kickUser,
          token: accessToken,
          clientId: apiService.getKickClientId(),
          avatar: 'https://files.kick.com/images/user/default/profile_image.png'
        };
        storageService.saveProfiles(profiles);

        const creds = storageService.getAuthCreds();
        creds.kickUsername = kickUser;
        creds.kickToken = accessToken;
        storageService.saveAuthCreds(creds);

        // Fetch user avatar if available
        try {
          const kRes = await apiService.fetchKickChannel(kickUser);
          if (kRes.success && kRes.channel.avatar) {
            profiles.kick.avatar = kRes.channel.avatar;
            storageService.saveProfiles(profiles);
          }
        } catch (e) {}

        // Clean URL search without reloading
        window.history.replaceState(null, null, window.location.pathname);
        this.showToast(`¡Cuenta de Kick vinculada con éxito vía Kick OAuth 2.0!`, 'success');
        return true;
      }
    }

    return false;
  }

  // ==========================================
  // VIEW ROUTER (Landing <-> Direct Mod Deck)
  // ==========================================

  switchView(viewName) {
    if (viewName === 'selector') viewName = 'deck';
    this.currentView = viewName;
    
    // Persist current view state
    localStorage.setItem('orbimod_active_view', viewName);
    if (window.location.hash !== (viewName === 'deck' ? '#deck' : '#home')) {
      window.history.replaceState(null, null, viewName === 'deck' ? '#deck' : '#home');
    }

    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));

    const target = document.getElementById(`view-${viewName}`) || 
                   (viewName === 'deck' ? document.getElementById('view-mod-deck') : null);
    if (target) {
      target.classList.add('active');
    }

    if (viewName === 'landing') {
      this.updateLandingAuthStatus();
    } else if (viewName === 'deck') {
      this.launchModDeck();
    }
  }

  // ==========================================
  // VIEW 1: LANDING LOGIC
  // ==========================================

  _bindLandingControls() {
    // Top-Corner Login Button
    document.getElementById('btn-landing-login-corner')?.addEventListener('click', () => {
      this.unifiedAuthModal.open('twitch');
    });

    // Hero CTA Buttons
    document.getElementById('btn-hero-start-auth')?.addEventListener('click', () => {
      this.unifiedAuthModal.open('twitch');
    });

    document.getElementById('btn-hero-guest-deck')?.addEventListener('click', () => {
      this.switchView('deck');
    });

    // Feature Cards
    document.querySelectorAll('.btn-launch-demo').forEach(btn => {
      btn.addEventListener('click', () => this.switchView('deck'));
    });

    // Nav Auth Button in Header
    document.getElementById('landing-user-profile-badge')?.addEventListener('click', () => {
      this.switchView('deck');
    });

    // Footer Links & Brand Link
    document.querySelectorAll('.landing-nav-brand, .footer-brand').forEach(el => {
      el.addEventListener('click', () => this.switchView('landing'));
    });

    // Smooth Scroll for Navigation Anchor Links
    document.querySelectorAll('.landing-nav-links a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#') {
          e.preventDefault();
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  logout() {
    if (confirm('¿Estás seguro de que deseas cerrar tu sesión en OrbiMod?')) {
      localStorage.setItem('orbimod_active_view', 'landing');
      storageService.clearAuth();
      supabaseAuthService.signOut();
      try { this.twitchClient.disconnect?.(); } catch (e) {}
      try { this.kickClient.disconnect?.(); } catch (e) {}
      this.updateLandingAuthStatus();
      this.switchView('landing');
      this.showToast('Has cerrado sesión correctamente', 'info');
    }
  }

  updateLandingAuthStatus() {
    const profiles = storageService.getProfiles();
    const emailUser = supabaseAuthService.getCurrentUser();

    const cornerLoginBtn = document.getElementById('btn-landing-login-corner');
    const userProfileBadge = document.getElementById('landing-user-profile-badge');
    const userNameEl = document.getElementById('landing-user-name');
    const userAvatarEl = document.getElementById('landing-user-avatar');

    const isTwitchAuth = profiles.twitch && profiles.twitch.valid;
    const isKickAuth = profiles.kick && profiles.kick.valid;
    const isEmailAuth = !!emailUser;

    if (isTwitchAuth || isKickAuth || isEmailAuth) {
      if (cornerLoginBtn) cornerLoginBtn.style.display = 'none';
      if (userProfileBadge) {
        userProfileBadge.style.display = 'flex';
        if (isTwitchAuth) {
          if (userNameEl) userNameEl.textContent = `@${profiles.twitch.login}`;
          if (userAvatarEl) userAvatarEl.src = profiles.twitch.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop';
        } else if (isKickAuth) {
          if (userNameEl) userNameEl.textContent = `@${profiles.kick.username} (Kick)`;
          if (userAvatarEl) userAvatarEl.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
        } else if (isEmailAuth) {
          if (userNameEl) userNameEl.textContent = emailUser.displayName || emailUser.email.split('@')[0];
          if (userAvatarEl) userAvatarEl.src = emailUser.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${emailUser.email}`;
        }
      }
    } else {
      if (cornerLoginBtn) cornerLoginBtn.style.display = 'flex';
      if (userProfileBadge) userProfileBadge.style.display = 'none';
    }
  }

  handleUnifiedLoginSuccess(res) {
    if (res.platform === 'twitch') {
      this.showToast('🟣 Conectando con Twitch...', 'twitch');
    } else if (res.platform === 'kick') {
      this.showToast(`🟢 Conectado con Kick como @${res.username}`, 'success');
      this.updateLandingAuthStatus();
      this.switchView('deck');
    } else if (res.platform === 'email') {
      this.showToast(`✉️ Sesión iniciada como ${res.user.displayName || res.user.email}`, 'success');
      this.updateLandingAuthStatus();
      this.switchView('deck');
    }
  }

  // ==========================================
  // VIEW 2: MOD DECK LAUNCH
  // ==========================================

  async launchModDeck() {
    this.channels = storageService.getChannels() || [];
    
    // Sync with Supabase cloud if user is authenticated
    await this.syncFromSupabase();

    // Stop any simulated messages
    this.simulator.stop();

    // Render channels in deck immediately
    this.renderChannels();

    // Start connections
    this.initConnections();

    // Update Profile pills
    this._updateAccountPills();

    // Verify accurate live status for all channels
    if (this.channels.length > 0) {
      this.channels = await apiService.checkLiveStatus(this.channels);
      storageService.saveChannels(this.channels);
      this.renderChannels();
    }

    // Refresh Channel Search & History Bar
    this.searchHistoryBar?.render();
  }

  async syncFromSupabase() {
    const user = supabaseAuthService.getCurrentUser();
    if (!user || !user.id) return;

    try {
      // 1. Sync User Layout
      const layoutRes = await supabaseAuthService.loadUserLayout(user.id);
      if (layoutRes.success && layoutRes.layout) {
        if (layoutRes.layout.layout_type) {
          this.selectedLayout = layoutRes.layout.layout_type;
          this.setLayout(this.selectedLayout);
        }
        if (Array.isArray(layoutRes.layout.channels) && layoutRes.layout.channels.length > 0) {
          this.channels = layoutRes.layout.channels;
          storageService.saveChannels(this.channels);
        }
      }

      // 2. Sync Moderated Channel History
      const histRes = await supabaseAuthService.loadChannelHistory(user.id);
      if (histRes.success && histRes.channels.length > 0) {
        const localHistory = storageService.getChannelHistory();
        const map = new Map();
        histRes.channels.forEach(ch => {
          map.set(ch.channel_id, {
            id: ch.channel_id,
            name: ch.name,
            platform: ch.platform,
            role: ch.role || 'mod',
            avatar: ch.avatar || '',
            addedAt: ch.added_at
          });
        });
        localHistory.forEach(ch => map.set(ch.id, ch));
        storageService.saveChannelHistory(Array.from(map.values()));
      }
    } catch (e) {
      console.warn('[Supabase Cloud Sync Error]', e);
    }
  }

  async syncToSupabase() {
    const user = supabaseAuthService.getCurrentUser();
    if (!user || !user.id) return;

    try {
      await supabaseAuthService.saveUserLayout(user.id, {
        layoutType: this.selectedLayout || this.settings.layout || 'grid-4',
        channels: this.channels,
        activeWidgets: Array.from(this.activeWidgets),
        preferences: { theme: 'cyber-dark' }
      });

      const history = storageService.getChannelHistory();
      if (history.length > 0) {
        await supabaseAuthService.saveChannelHistory(user.id, history);
      }
    } catch (e) {
      console.warn('[Supabase Cloud Save Error]', e);
    }
  }

  _updateAccountPills() {
    const profiles = storageService.getProfiles();
    const twitchDot = document.getElementById('twitch-conn-dot');
    const kickDot = document.getElementById('kick-conn-dot');
    const twitchText = document.getElementById('twitch-conn-text');
    const kickText = document.getElementById('kick-conn-text');

    if (profiles.twitch && profiles.twitch.valid) {
      if (twitchDot) {
        twitchDot.style.background = 'var(--success-green)';
        twitchDot.style.boxShadow = '0 0 8px var(--success-green)';
      }
      if (twitchText) twitchText.innerHTML = `Twitch: <strong>@${profiles.twitch.login}</strong>`;
    }

    if (profiles.kick && profiles.kick.valid) {
      if (kickDot) {
        kickDot.style.background = 'var(--success-green)';
        kickDot.style.boxShadow = '0 0 8px var(--success-green)';
      }
      if (kickText) kickText.innerHTML = `Kick: <strong>@${profiles.kick.username}</strong>`;
    }
  }

  _bindHeaderControls() {
    // Return to Landing from Header Logo
    document.getElementById('header-logo-home-btn')?.addEventListener('click', () => {
      this.switchView('landing');
    });

    // Open Centralized Channel Manager right on top of Deck
    document.getElementById('btn-header-manage-channels')?.addEventListener('click', () => {
      this.manageChannelsModal.open();
    });

    document.getElementById('btn-deck-logout')?.addEventListener('click', () => {
      this.logout();
    });

    // Backdrop Drawer closer
    document.getElementById('drawer-backdrop')?.addEventListener('click', () => {
      this.inspectorDrawer.close();
      this.automodDrawer.close();
      this.auditLogDrawer.close();
      this.eventRadarDrawer.close();
    });

    // Layout Switchers
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layoutClass = btn.dataset.layout;
        this.selectedLayout = layoutClass;
        this.setLayout(layoutClass);
      });
    });

    // AutoMod & Audit Drawers
    document.getElementById('btn-automod-queue')?.addEventListener('click', () => this.automodDrawer.open());
    document.getElementById('btn-audit-log')?.addEventListener('click', () => this.auditLogDrawer.open());

    // Live vs All Filter Toggle
    document.getElementById('btn-toggle-live-filter')?.addEventListener('click', () => {
      this.showOnlyLive = !this.showOnlyLive;
      this._updateLiveFilterButton();
      this.renderChannels();
      this.showToast(this.showOnlyLive ? 'Mostrando solo canales EN VIVO' : 'Mostrando TODOS los canales (en vivo y offline)', 'info');
    });

    // Sound Toggle
    document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
      this.settings.soundEnabled = !this.settings.soundEnabled;
      storageService.saveSettings(this.settings);
      soundService.toggleSound(this.settings.soundEnabled);
      this._updateSoundBtnVisual(this.settings.soundEnabled);
      this.showToast(this.settings.soundEnabled ? 'Sonidos activados' : 'Sonidos silenciados', 'info');
    });
  }

  _updateLiveFilterButton() {
    const btn = document.getElementById('btn-toggle-live-filter');
    const label = document.getElementById('live-filter-label');
    if (!btn || !label) return;
    btn.classList.toggle('active', this.showOnlyLive);
    label.textContent = this.showOnlyLive ? '🔴 Solo En Vivo' : '⚪ Todos los Canales';
  }

  async refreshChannelsLiveStatus() {
    this.channels = await apiService.checkLiveStatus(this.channels);
    storageService.saveChannels(this.channels);
    this.renderChannels();
  }

  _updateSoundBtnVisual(enabled) {
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (!soundBtn) return;
    soundBtn.classList.toggle('active', enabled);
    soundBtn.title = enabled ? 'Audio Activado' : 'Audio Silenciado';
    soundBtn.innerHTML = enabled ?
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>` :
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  }

  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // ESC closes any open drawer or modal
      if (e.key === 'Escape') {
        this.inspectorDrawer.close();
        this.automodDrawer.close();
        this.auditLogDrawer.close();
        this.eventRadarDrawer.close();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        return;
      }

      // Alt + Shortcuts
      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          this.setLayout('layout-chat-wall');
          this.showToast('Vista cambiada: 🧱 Muro de Chats', 'info');
        } else if (e.key === '2') {
          e.preventDefault();
          this.setLayout('layout-grid-2x2');
          this.showToast('Vista cambiada: 🎛️ Grid 2x2', 'info');
        } else if (e.key === '3') {
          e.preventDefault();
          this.setLayout('layout-split-1-2');
          this.showToast('Vista cambiada: ⚡ Split 1+2', 'info');
        } else if (e.key === '4') {
          e.preventDefault();
          this.setLayout('layout-dual-columns');
          this.showToast('Vista cambiada: 👥 Dual Stream', 'info');
        } else if (e.key === '5') {
          e.preventDefault();
          this.setLayout('layout-single-focus');
          this.showToast('Vista cambiada: 🎯 Focus 1', 'info');
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          this.automodDrawer.open();
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          this.auditLogDrawer.open();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          this.eventRadarDrawer.open();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          const shieldBtn = document.getElementById('btn-global-shield');
          this.handleShieldToggle(!shieldBtn.classList.contains('active'));
        }
      }

      // Ctrl + 1..9 Canned Macros Trigger on First Focused Channel
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const macros = storageService.getMacros();
        const hotkeyStr = `Ctrl+${e.key}`;
        const match = macros.find(m => m.hotkey === hotkeyStr);
        if (match && this.channels.length > 0) {
          e.preventDefault();
          const targetChan = this.channels[0];
          this.sendMessage(targetChan, match.text);
          this.showToast(`Macro "${match.name}" enviado a #${targetChan.name}`, 'twitch');
        }
      }
    });
  }

  _setupAutoModListener() {
    automodService.onQueueChange((queue) => {
      const pending = queue.filter(i => i.status === 'pending').length;
      const countEl = document.getElementById('automod-badge-count');
      if (countEl) {
        countEl.textContent = pending;
        countEl.style.display = pending > 0 ? 'flex' : 'none';
      }
    });
  }

  _startVelocityMeter() {
    this.msgVelocityTimer = setInterval(() => {
      this.msgVelocity = Math.round(this.recentMsgCount / 2);
      this.recentMsgCount = 0;
      const velEl = document.getElementById('metric-msg-velocity');
      if (velEl) velEl.textContent = `${this.msgVelocity} msg/s`;
    }, 2000);
  }

  setLayout(layoutClass) {
    this.settings.layout = layoutClass;
    storageService.saveSettings(this.settings);

    const deck = document.getElementById('channels-deck');
    deck.className = `channels-deck ${layoutClass}`;

    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layoutClass);
    });
  }

  renderChannels() {
    const deck = document.getElementById('channels-deck');
    deck.innerHTML = '';
    this.channelCards.clear();

    const channelsToDisplay = this.showOnlyLive
      ? this.channels.filter(c => Boolean(c.isLive))
      : this.channels;

    if (channelsToDisplay.length === 0 && this.channels.length > 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.style.cssText = 'grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); text-align: center; padding: 40px; gap: 14px;';
      emptyNotice.innerHTML = `
        <div style="font-size: 36px;">📡</div>
        <div style="font-size: 15px; font-weight: 700; color: #fff;">Tus canales están fuera de línea (Offline)</div>
        <div style="font-size: 12px; max-width: 440px; color: var(--text-dim);">Actualmente ningún canal en tu lista está transmitiendo en vivo. Puedes alternar a ver canales offline, añadir un canal en vivo o esperar a que comiencen su directo.</div>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button id="btn-empty-show-all" class="btn btn-secondary" style="font-size: 12px;">Mostrar Canales Offline</button>
          <button id="btn-empty-add-chan" class="btn btn-primary" style="font-size: 12px;">+ Añadir Canal en Vivo</button>
        </div>
      `;
      deck.appendChild(emptyNotice);

      emptyNotice.querySelector('#btn-empty-show-all')?.addEventListener('click', () => {
        this.showOnlyLive = false;
        this._updateLiveFilterButton();
        this.renderChannels();
      });
      emptyNotice.querySelector('#btn-empty-add-chan')?.addEventListener('click', () => {
        document.getElementById('deck-channel-search-input')?.focus();
      });
    } else {
      channelsToDisplay.forEach(ch => {
        const cardInstance = new ChannelCard(ch, {
          getMacros: () => storageService.getMacros(),
          onTimeout: (channel, msgObj, dur) => this.handleTimeout(channel, msgObj, dur, 'Acción rápida en mensaje'),
          onBan: (channel, msgObj) => this.handleBan(channel, msgObj, 'Baneo rápido en mensaje'),
          onDelete: (channel, msgObj) => this.handleDelete(channel, msgObj, 'Mensaje eliminado manualmente'),
          onInspect: (userObj, channel, sessionMsgs) => this.inspectorDrawer.open(userObj, channel, sessionMsgs),
          onSendMessage: (channel, text) => this.sendMessage(channel, text),
          onToggleMode: (channel, mode, active) => this.handleRoomModeChange(channel, mode, active),
          onRemoveChannel: (id) => this.removeChannel(id)
        });

        this.channelCards.set(ch.id, cardInstance);
        deck.appendChild(cardInstance.render());
      });
    }

    const headerCount = document.getElementById('header-channels-count');
    if (headerCount) headerCount.textContent = `${channelsToDisplay.length}/${this.channels.length}`;

    // Add empty placeholder card to invite adding more channels if < 4
    if (channelsToDisplay.length > 0 && channelsToDisplay.length < 4) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'empty-channel-slot';
      emptySlot.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        <div style="font-weight: 600; font-size: 13px;">+ Añadir Canal al Deck</div>
        <div style="font-size: 11px;">Escribe el nombre arriba o elige de tu historial</div>
      `;
      emptySlot.addEventListener('click', () => document.getElementById('deck-channel-search-input')?.focus());
      deck.appendChild(emptySlot);
    }

    this._updateHeaderMetrics();
  }

  _updateHeaderMetrics() {
    const totalChannelsEl = document.getElementById('metric-channels-count');
    if (totalChannelsEl) totalChannelsEl.textContent = `${this.channels.length} Activos`;

    const chattersEl = document.getElementById('metric-total-chatters');
    if (chattersEl) chattersEl.textContent = `${this.uniqueChatters.size} Usuarios`;
  }

  // --- Real-time Message Flow & AutoMod Evaluation ---
  handleIncomingMessage(msg) {
    this.totalMessagesCount++;
    this.recentMsgCount++;
    this.uniqueChatters.add(msg.username.toLowerCase());
    this._updateHeaderMetrics();

    // 1. Evaluate with AutoMod Engine
    const evalResult = automodService.evaluate(msg.text, msg.username, msg.channel, msg.platform);

    if (!evalResult.passed) {
      // Message flagged! Queue for review
      automodService.queueForReview(msg, evalResult.reason, evalResult.ruleType);

      // Log in Audit Log
      storageService.addAuditLog({
        action: 'AUTOMOD_FLAG',
        targetUser: msg.username,
        channel: msg.channel,
        platform: msg.platform,
        mod: 'AutoMod Shield',
        details: `${evalResult.reason} -> "${msg.text.slice(0, 45)}..."`
      });

      this.showToast(`AutoMod bloqueó mensaje de @${msg.username} en #${msg.channel}`, 'danger');
      return; // Do not show in normal chat until approved
    }

    // 2. Route to appropriate Channel Card
    const targetCard = Array.from(this.channelCards.values()).find(
      c => c.channel.name.toLowerCase() === msg.channel.toLowerCase()
    );

    if (targetCard) {
      targetCard.addMessage(msg);
    }
  }

  handlePlatformModAction(action) {
    // Action from Twitch IRC / Kick pusher (e.g. CLEARCHAT, CLEARMSG)
    if (action.type === 'DELETE' && action.targetMsgId) {
      this.channelCards.forEach(c => c.markMessageDeleted(action.targetMsgId));
    }
  }

  // --- Moderation Operations ---
  handleTimeout(channel, userObj, duration = 600, reason = 'Violación de normas') {
    const username = userObj.username;
    soundService.playTimeoutSound();

    // 1. Local Storage Audit & Sanction
    storageService.addAuditLog({
      action: 'TIMEOUT',
      targetUser: username,
      channel: channel.name,
      platform: channel.platform,
      mod: 'Tú (Lead Mod)',
      details: `${duration}s por "${reason}"`
    });

    const userKey = `${username.toLowerCase()}@${channel.platform}`;
    storageService.addUserSanction(userKey, {
      type: 'timeout',
      duration: duration,
      reason: reason,
      channel: channel.name
    });

    // 2. Send command to platform IRC/Pusher
    if (channel.platform === 'twitch') {
      this.twitchClient.sendModCommand(channel.name, `/timeout ${username} ${duration} ${reason}`);
    }

    this.showToast(`Timeout a @${username} por ${duration}s en #${channel.name}`, 'warning');
  }

  handleBan(channel, userObj, reason = 'Baneo permanente') {
    const username = userObj.username;
    soundService.playBanSound();

    storageService.addAuditLog({
      action: 'BAN',
      targetUser: username,
      channel: channel.name,
      platform: channel.platform,
      mod: 'Tú (Lead Mod)',
      details: reason
    });

    const userKey = `${username.toLowerCase()}@${channel.platform}`;
    storageService.addUserSanction(userKey, {
      type: 'ban',
      reason: reason,
      channel: channel.name
    });

    if (channel.platform === 'twitch') {
      this.twitchClient.sendModCommand(channel.name, `/ban ${username} ${reason}`);
    }

    this.showToast(`@${username} BANEADO permanentemente de #${channel.name}`, 'danger');
  }

  handleUnban(channel, userObj) {
    const username = userObj.username;
    storageService.addAuditLog({
      action: 'UNBAN',
      targetUser: username,
      channel: channel.name,
      platform: channel.platform,
      mod: 'Tú (Lead Mod)',
      details: 'Perdón / Desbaneo manual'
    });

    if (channel.platform === 'twitch') {
      this.twitchClient.sendModCommand(channel.name, `/unban ${username}`);
    }

    this.showToast(`@${username} ha sido desbaneado en #${channel.name}`, 'success');
  }

  handleDelete(channel, msgObj, reason = 'Eliminado') {
    storageService.addAuditLog({
      action: 'DELETE',
      targetUser: msgObj.username,
      channel: channel.name,
      platform: channel.platform,
      mod: 'Tú (Lead Mod)',
      details: `Mensaje: "${(msgObj.text || '').slice(0, 40)}"`
    });

    if (channel.platform === 'twitch' && msgObj.id) {
      this.twitchClient.sendModCommand(channel.name, `/delete ${msgObj.id}`);
    }

    const card = Array.from(this.channelCards.values()).find(c => c.channel.name.toLowerCase() === channel.name.toLowerCase());
    if (card && msgObj.id) {
      card.markMessageDeleted(msgObj.id);
    }
  }

  handleRoomModeChange(channel, mode, active) {
    storageService.addAuditLog({
      action: 'MODE_CHANGE',
      channel: channel.name,
      platform: channel.platform,
      mod: 'Tú (Lead Mod)',
      details: `Modo ${mode.toUpperCase()} -> ${active ? 'ACTIVADO' : 'DESACTIVADO'}`
    });

    if (channel.platform === 'twitch') {
      if (mode === 'slow') this.twitchClient.sendModCommand(channel.name, active ? `/slow ${channel.slowMode || 5}` : '/slowoff');
      else if (mode === 'sub') this.twitchClient.sendModCommand(channel.name, active ? '/subscribers' : '/subscribersoff');
      else if (mode === 'follow') this.twitchClient.sendModCommand(channel.name, active ? '/followers 10m' : '/followersoff');
      else if (mode === 'emote') this.twitchClient.sendModCommand(channel.name, active ? '/emoteonly' : '/emoteonlyoff');
      else if (mode === 'clear') this.twitchClient.sendModCommand(channel.name, '/clear');
    }

    this.showToast(`Modo ${mode} en #${channel.name} ${active ? 'activado' : 'desactivado'}`, 'twitch');
  }

  handleShieldToggle(active) {
    this.settings.shieldActive = active;
    storageService.saveSettings(this.settings);

    const shieldBtn = document.getElementById('btn-global-shield');
    if (shieldBtn) {
      shieldBtn.classList.toggle('active', active);
      shieldBtn.innerHTML = active ?
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>ESCUDO ACTIVO</span>` :
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>Escudo</span>`;
    }

    if (active) {
      soundService.playRaidAlert();
      automodService.updateConfig({ blockLinks: true, capsThreshold: 50 });
      this.channels.forEach(ch => {
        ch.slowMode = 10;
        ch.followOnly = true;
      });
      this.renderChannels();
      this.showToast('🛡️ MODO ESCUDO ACTIVADO: Bloqueo estricto y modo lento activado en todos los canales', 'danger');
    } else {
      this.showToast('Modo escudo desactivado', 'success');
    }

    storageService.addAuditLog({
      action: 'SHIELD',
      channel: 'GLOBAL',
      platform: 'ALL',
      mod: 'Tú (Lead Mod)',
      details: active ? 'ACTIVACIÓN DE ESCUDO GLOBAL' : 'DESACTIVACIÓN DE ESCUDO GLOBAL'
    });
  }

  sendMessage(channel, text) {
    // Read-only Live Moderation: outbound messages are disabled
    console.log(`[OrbiMod] Chat en modo solo lectura para #${channel.name}`);
  }

  addChannel(newChan) {
    if (this.channels.some(c => c.name.toLowerCase() === newChan.name.toLowerCase() && c.platform === newChan.platform)) {
      this.showToast('El canal ya está en tu lista activa', 'warning');
      return;
    }

    this.channels.push(newChan);
    storageService.saveChannels(this.channels);
    storageService.addToHistory(newChan);
    this.renderChannels();
    this.initConnections();
    this.searchHistoryBar?.render();
    this.syncToSupabase();
    this.showToast(`Canal #${newChan.name} (${newChan.platform.toUpperCase()}) añadido al Deck`, 'success');
  }

  removeChannel(channelId) {
    const target = this.channels.find(c => c.id === channelId);
    if (target) {
      if (target.platform === 'twitch') this.twitchClient.partChannel(target.name);
      if (target.platform === 'kick') this.kickClient.partChannel(target.name);
    }

    this.channels = this.channels.filter(c => c.id !== channelId);
    storageService.saveChannels(this.channels);
    this.renderChannels();
    this.searchHistoryBar?.render();
    this.syncToSupabase();
    this.showToast('Canal removido del deck', 'warning');
  }

  initConnections() {
    const creds = storageService.getAuthCreds();
    const profiles = storageService.getProfiles();

    const twitchToken = profiles.twitch?.token || creds.twitchToken || null;
    const twitchUsername = profiles.twitch?.login || creds.twitchUsername || null;

    // Twitch WebSocket (Read-only IRC listener)
    this.twitchClient.connect(twitchToken, twitchUsername);
    this.channels.filter(c => c.platform === 'twitch').forEach(c => {
      this.twitchClient.joinChannel(c.name);
    });

    // Kick Pusher WebSocket (Read-only chatroom listener)
    this.kickClient.connect();
    this.channels.filter(c => c.platform === 'kick').forEach(c => {
      this.kickClient.joinChannel(c.name);
    });

    // Simulator is strictly OFF unless explicitly in demo mode
    this.simulator.setChannels(this.channels);
    if (this.settings.demoMode) {
      this.simulator.start();
    } else {
      this.simulator.stop();
    }
  }

  handleConnectionsUpdate(payload) {
    if (!payload) return;

    if (payload.importChannels && Array.isArray(payload.importChannels)) {
      payload.importChannels.forEach(ch => {
        if (!this.channels.some(existing => existing.name.toLowerCase() === ch.name.toLowerCase() && existing.platform === ch.platform)) {
          this.channels.push(ch);
        }
      });
      storageService.saveChannels(this.channels);
      this.renderChannels();
      this.initConnections();
      this.showToast(`⚡ Se importaron ${payload.importChannels.length} canales moderados al Deck`, 'success');
      return;
    }

    if (payload.importSingle) {
      const ch = payload.importSingle;
      if (!this.channels.some(existing => existing.name.toLowerCase() === ch.name.toLowerCase())) {
        this.addChannel(ch);
      }
      return;
    }

    if (payload.demoMode !== undefined) {
      if (payload.demoMode) {
        this.simulator.start();
      } else {
        this.simulator.stop();
      }
    }

    this._updateAccountPills();
    this.initConnections();
    this.showToast('Conexiones y credenciales actualizadas', 'success');
  }

  updateConnectionPill(platform, connected) {
    const dot = document.getElementById(`${platform}-conn-dot`);
    if (dot) {
      dot.style.background = connected ? 'var(--success-green)' : 'var(--danger-red)';
      dot.style.boxShadow = connected ? '0 0 8px var(--success-green)' : 'none';
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Initialize App once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.orbiModApp = new OrbiModApp();
  window.orbiModApp.init();
});
