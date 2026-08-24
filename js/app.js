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
import { AddChannelModal, AutoModSettingsModal, ConnectionHubModal, HotkeysModal } from './components/modals.js';

class OrbiModApp {
  constructor() {
    this.channels = storageService.getChannels();
    this.settings = storageService.getSettings();
    this.channelCards = new Map(); // id -> ChannelCard instance

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
          // Dispatch to channel card
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

    this.macroModal = new MacroManagerModal(
      document.getElementById('generic-modal'),
      () => this._refreshAllCardMacros()
    );

    this.addChannelModal = new AddChannelModal(
      document.getElementById('generic-modal'),
      (newChan) => this.addChannel(newChan)
    );

    this.automodSettingsModal = new AutoModSettingsModal(
      document.getElementById('generic-modal'),
      () => this.showToast('Reglas de AutoMod actualizadas', 'success')
    );

    this.connectionHubModal = new ConnectionHubModal(
      document.getElementById('generic-modal'),
      (creds) => this.handleConnectionsUpdate(creds)
    );

    this.hotkeysModal = new HotkeysModal(document.getElementById('generic-modal'));

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
    this._bindKeyboardShortcuts();
    this._startVelocityMeter();
    this._setupAutoModListener();

    // Check URL hash for OAuth redirect token (#access_token=...)
    await this._checkOAuthRedirect();

    // Sound toggle init
    soundService.toggleSound(this.settings.soundEnabled);
    this._updateSoundBtnVisual(this.settings.soundEnabled);

    // Apply layout
    this.setLayout(this.settings.layout || 'layout-grid-2x2');

    // Shield status
    if (this.settings.shieldActive) {
      this.handleShieldToggle(true);
    }

    // Render channels
    this.renderChannels();

    // Start connections
    this.initConnections();

    // Update Profile pills
    this._updateAccountPills();

    this.showToast('OrbiMod iniciado correctamente', 'success');
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
            this.showToast(`⚡ Se detectaron ${modRes.channels.length} canales donde eres moderador en Twitch`, 'success');
          }
        }
      }
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
    // Backdrop Drawer closer
    document.getElementById('drawer-backdrop').addEventListener('click', () => {
      this.inspectorDrawer.close();
      this.automodDrawer.close();
      this.auditLogDrawer.close();
      this.eventRadarDrawer.close();
    });

    // Layout Switchers
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layoutClass = btn.dataset.layout;
        this.setLayout(layoutClass);
      });
    });

    // Header Action Buttons
    document.getElementById('btn-add-channel').addEventListener('click', () => this.addChannelModal.open());
    document.getElementById('btn-automod-queue').addEventListener('click', () => this.automodDrawer.open());
    document.getElementById('btn-audit-log').addEventListener('click', () => this.auditLogDrawer.open());
    document.getElementById('btn-event-radar').addEventListener('click', () => this.eventRadarDrawer.open());
    document.getElementById('btn-macro-manager').addEventListener('click', () => this.macroModal.open());
    document.getElementById('btn-connection-hub').addEventListener('click', () => this.connectionHubModal.open());
    document.getElementById('btn-hotkeys-help').addEventListener('click', () => this.hotkeysModal.open());

    // Launchpad Step Cards & Actions
    document.getElementById('step-connect-twitch')?.addEventListener('click', () => {
      this.connectionHubModal.activeTab = 'twitch';
      this.connectionHubModal.open();
    });

    document.getElementById('step-connect-kick')?.addEventListener('click', () => {
      this.connectionHubModal.activeTab = 'kick';
      this.connectionHubModal.open();
    });

    document.getElementById('step-add-channels')?.addEventListener('click', () => {
      this.addChannelModal.open();
    });

    document.getElementById('step-config-automod')?.addEventListener('click', () => {
      this.automodDrawer.open();
    });

    // Dismiss / Collapse Launchpad
    const launchpad = document.getElementById('launchpad-hero');
    const dismissBtn = document.getElementById('btn-dismiss-launchpad');
    dismissBtn?.addEventListener('click', () => {
      if (launchpad.style.display === 'none') {
        launchpad.style.display = 'flex';
      } else {
        launchpad.style.display = 'none';
      }
    });

    // Simulator Toggle from Home
    const simBtn = document.getElementById('btn-toggle-demo-simulator');
    const simStatusText = document.getElementById('demo-status-text');
    simBtn?.addEventListener('click', () => {
      this.settings.demoMode = !this.settings.demoMode;
      storageService.saveSettings(this.settings);

      if (this.settings.demoMode) {
        this.simulator.start();
        if (simStatusText) {
          simStatusText.textContent = 'ACTIVO';
          simStatusText.style.color = 'var(--success-green)';
        }
        this.showToast('Simulador de chat en vivo activado', 'success');
      } else {
        this.simulator.stop();
        if (simStatusText) {
          simStatusText.textContent = 'PAUSADO';
          simStatusText.style.color = 'var(--text-dim)';
        }
        this.showToast('Simulador pausado', 'warning');
      }
    });

    // Shield Mode Button
    const shieldBtn = document.getElementById('btn-global-shield');
    shieldBtn.addEventListener('click', () => {
      const newState = !shieldBtn.classList.contains('active');
      this.handleShieldToggle(newState);
    });

    // Sound Toggle Button
    const soundBtn = document.getElementById('btn-toggle-sound');
    soundBtn.addEventListener('click', () => {
      const active = soundService.toggleSound();
      this.settings.soundEnabled = active;
      storageService.saveSettings(this.settings);
      this._updateSoundBtnVisual(active);
      this.showToast(active ? 'Efectos de audio activados' : 'Audio silenciado', 'warning');
    });
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
        if (e.key.toLowerCase() === 'a') {
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

    this.channels.forEach(ch => {
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

    // Add empty placeholder card to invite adding more channels if < 4
    if (this.channels.length < 4) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'empty-channel-slot';
      emptySlot.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        <div style="font-weight: 600; font-size: 13px;">+ Añadir Canal al Deck</div>
        <div style="font-size: 11px;">Twitch o Kick simultáneo</div>
      `;
      emptySlot.addEventListener('click', () => this.addChannelModal.open());
      deck.appendChild(emptySlot);
    }

    this._updateHeaderMetrics();
  }

  _refreshAllCardMacros() {
    this.channelCards.forEach(card => card._renderMacros());
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
    if (channel.platform === 'twitch') {
      this.twitchClient.sendMessage(channel.name, text);
    }

    // Local echo
    const card = Array.from(this.channelCards.values()).find(c => c.channel.name.toLowerCase() === channel.name.toLowerCase());
    if (card) {
      card.addMessage({
        id: 'self-' + Date.now(),
        platform: channel.platform,
        channel: channel.name,
        username: 'Tú (Mod)',
        displayName: 'Tú (Mod)',
        color: channel.platform === 'kick' ? '#53fc18' : '#bf94ff',
        badges: ['moderator'],
        text: text,
        timestamp: new Date().toISOString(),
        isMod: true,
        isSub: true,
        isVip: false
      });
    }
  }

  addChannel(newChan) {
    this.channels.push(newChan);
    storageService.saveChannels(this.channels);
    this.renderChannels();

    if (newChan.platform === 'twitch') {
      this.twitchClient.joinChannel(newChan.name);
    } else {
      this.kickClient.joinChannel(newChan.name);
    }

    this.simulator.setChannels(this.channels);
    this.showToast(`Canal #${newChan.name} (${newChan.platform.toUpperCase()}) añadido`, 'success');
  }

  removeChannel(id) {
    const ch = this.channels.find(c => c.id === id);
    if (ch) {
      if (ch.platform === 'twitch') this.twitchClient.partChannel(ch.name);
      else this.kickClient.partChannel(ch.name);
    }

    this.channels = this.channels.filter(c => c.id !== id);
    storageService.saveChannels(this.channels);
    this.renderChannels();
    this.simulator.setChannels(this.channels);
    this.showToast('Canal removido del deck', 'warning');
  }

  initConnections() {
    const creds = storageService.getAuthCreds();

    // Twitch
    this.twitchClient.connect(creds.twitchToken, creds.twitchUsername);
    this.channels.filter(c => c.platform === 'twitch').forEach(c => {
      this.twitchClient.joinChannel(c.name);
    });

    // Kick
    this.kickClient.connect();
    this.channels.filter(c => c.platform === 'kick').forEach(c => {
      this.kickClient.joinChannel(c.name);
    });

    // Simulator
    this.simulator.setChannels(this.channels);
    if (this.settings.demoMode) {
      this.simulator.start();
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
