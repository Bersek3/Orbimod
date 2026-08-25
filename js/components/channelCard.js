/**
 * NEXUS MOD DECK — CHANNEL CARD COMPONENT
 * Video stream embed, live chat feed, quick mod action overlays, room controls
 */

import { renderBadgesHTML } from '../data/defaultBadges.js';

export class ChannelCard {
  constructor(channel, options = {}) {
    this.channel = channel; // { id, name, platform, avatar, viewers, isLive, videoEnabled, audioEnabled, slowMode, subOnly, followOnly, emoteOnly }
    this.options = options; // { onTimeout, onBan, onDelete, onInspect, onSendMessage, onToggleMode, onRemoveChannel }
    this.element = null;
    this.messagesContainer = null;
    this.pausedIndicator = null;
    this.isScrolledUp = false;
    this.unreadCountWhilePaused = 0;
    this.maxMessages = 120;
    this.messages = [];
  }

  _getPlayerIframeSrc() {
    const isTwitch = this.channel.platform === 'twitch';
    const cleanName = (this.channel.name || '').trim().toLowerCase().replace(/[@#]/g, '');
    const isMuted = !this.channel.audioEnabled;

    if (isTwitch) {
      const hostname = window.location.hostname || 'localhost';
      const parents = new Set([hostname]);
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        parents.add('localhost');
        parents.add('127.0.0.1');
      }
      if (hostname.includes('github.io')) {
        parents.add(hostname);
      }
      const parentParams = Array.from(parents).map(p => `parent=${encodeURIComponent(p)}`).join('&');

      // Twitch stream starts muted in URL for safe autoplay, then unmuted via JS API on user gesture
      return `https://player.twitch.tv/?channel=${encodeURIComponent(cleanName)}&${parentParams}&autoplay=true&muted=true&playsinline=true`;
    } else {
      return `https://player.kick.com/${encodeURIComponent(cleanName)}?autoplay=true&muted=${isMuted}`;
    }
  }

  _initTwitchEmbedPlayer(containerEl) {
    if (!window.Twitch || !window.Twitch.Player) return false;
    const cleanName = (this.channel.name || '').trim().toLowerCase().replace(/[@#]/g, '');
    const hostname = window.location.hostname || 'localhost';
    const parents = new Set([hostname]);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      parents.add('localhost');
      parents.add('127.0.0.1');
    }
    if (hostname.includes('github.io')) parents.add(hostname);

    containerEl.innerHTML = '';
    const targetDiv = document.createElement('div');
    targetDiv.id = `twitch-player-target-${this.channel.id}`;
    targetDiv.style.cssText = 'width:100%; height:100%; position:absolute; top:0; left:0;';
    containerEl.appendChild(targetDiv);

    try {
      this.twitchPlayer = new window.Twitch.Player(targetDiv.id, {
        channel: cleanName,
        parent: Array.from(parents),
        width: '100%',
        height: '100%',
        autoplay: true,
        muted: !this.channel.audioEnabled,
        playsinline: true
      });

      this.twitchPlayer.addEventListener(window.Twitch.Player.READY, () => {
        if (this.channel.audioEnabled) {
          this.twitchPlayer.setMuted(false);
          this.twitchPlayer.setVolume(1.0);
        } else {
          this.twitchPlayer.setMuted(true);
        }
      });
      return true;
    } catch (e) {
      console.warn('[Twitch SDK fallback]', e);
      return false;
    }
  }

  render() {
    const card = document.createElement('div');
    card.className = `channel-card ${this.channel.platform}`;
    card.id = `channel-card-${this.channel.id}`;

    const isTwitch = this.channel.platform === 'twitch';
    const platformLabel = isTwitch ? 'Twitch' : `<img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kick-streaming-platform-logo-icon.png" style="width: 10px; height: 10px; object-fit: contain; vertical-align: middle; margin-right: 3px;" alt="Kick" />Kick`;
    const tagClass = isTwitch ? 'badge-twitch' : 'badge-kick';
    const playerIframeSrc = this._getPlayerIframeSrc();
    const hasVideo = !!this.channel.videoEnabled;
    const hasAudio = !!this.channel.audioEnabled;

    const isMod = Boolean(this.channel.isModerator === true || this.channel.role === 'owner' || this.channel.role === 'mod');
    const isOwner = this.channel.role === 'owner';
    const modRoleBadgeHtml = isOwner
      ? `<span class="mod-role-pill owner" title="Eres el propietario del canal">👑 PROPIETARIO</span>`
      : (isMod
        ? `<span class="mod-role-pill mod" title="Eres moderador activo en este canal">🛡️ MOD</span>`
        : `<span class="mod-role-pill stream-only" title="Modo Solo Stream / Espectador (sin permisos de mod)">👁️ SOLO STREAM</span>`);

    card.innerHTML = `
      <!-- Header -->
      <div class="channel-header">
        <div class="channel-info">
          <!-- Drag Handle -->
          <div class="channel-drag-handle" title="Arrastrar y soltar para mover posición del panel">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor;">
              <circle cx="8.5" cy="6" r="1.5"/><circle cx="15.5" cy="6" r="1.5"/>
              <circle cx="8.5" cy="12" r="1.5"/><circle cx="15.5" cy="12" r="1.5"/>
              <circle cx="8.5" cy="18" r="1.5"/><circle cx="15.5" cy="18" r="1.5"/>
            </svg>
          </div>
          <img src="${this.channel.avatar || 'https://via.placeholder.com/26'}" class="channel-avatar ${this.channel.platform}" alt="${this.channel.name}" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop'">
          <div class="channel-name-block">
            <div class="channel-title">
              <span>#${this.channel.name}</span>
              <span class="channel-tag ${tagClass}">${platformLabel}</span>
            </div>
            <div class="channel-meta">
              ${this.channel.isLive !== false 
                ? `<span class="live-badge">● EN VIVO</span><span>${this.channel.viewers ? Number(this.channel.viewers).toLocaleString() + ' viewers' : 'Directo'}</span>`
                : `<span class="live-badge" style="background: rgba(255,255,255,0.08); color: var(--text-dim); border-color: rgba(255,255,255,0.15);">⚪ OFFLINE</span><span>Canal en espera</span>`
              }
              ${modRoleBadgeHtml}
            </div>
          </div>
        </div>

        <div class="channel-actions">
          <!-- Move Position Buttons -->
          <button class="icon-btn-subtle move-left-btn" title="Mover panel a la izquierda (←)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="icon-btn-subtle move-right-btn" title="Mover panel a la derecha (→)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <!-- Audio Toggle Button (Mute / Unmute) -->
          <button class="icon-btn-subtle audio-toggle-btn ${hasAudio ? 'active' : ''}" title="${hasAudio ? 'Silenciar Audio' : 'Activar Sonido (Unmute)'}">
            ${hasAudio ? `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            `}
          </button>

          <!-- Video Toggle Button -->
          <button class="icon-btn-subtle video-toggle-btn ${hasVideo ? 'active' : ''}" title="${hasVideo ? 'Ocultar Video Player' : 'Cargar Video Player'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </button>

          <!-- Reload Player Button -->
          <button class="icon-btn-subtle reload-player-btn" title="Recargar Stream si hay error de descarga">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>

          <!-- Clear Chat -->
          <button class="icon-btn-subtle clear-chat-btn" title="Limpiar Chat (/clear)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
          </button>

          <!-- Remove Channel -->
          <button class="icon-btn-subtle remove-channel-btn" title="Cerrar Canal de la Vista">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Optional Stream Video Player -->
      <div class="channel-player-container ${hasVideo ? '' : 'collapsed'}">
        ${hasVideo ? `
          <div class="player-mount-area" style="width:100%; height:100%; position:absolute; top:0; left:0;"></div>
        ` : `
          <div class="video-placeholder-lazy" style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); font-size: 11.5px; gap: 8px;">
            <span>📹 Modo Chat Ligero (Haz clic en el ícono de cámara arriba para cargar video)</span>
          </div>
        `}
      </div>

      <!-- Room Moderation Modes Bar -->
      ${isMod ? `
        <div class="room-modes-bar">
          <div class="room-mode-toggles">
            <button class="mode-chip slow-mode-btn ${this.channel.slowMode ? 'active' : ''}" data-mode="slow" title="Activar Modo Lento (Slow Mode)">
              ⏱️ Slow ${this.channel.slowMode ? this.channel.slowMode + 's' : 'Off'}
            </button>
            <button class="mode-chip sub-mode-btn ${this.channel.subOnly ? 'active' : ''}" data-mode="sub" title="Solo Suscriptores pueden chatear">
              ⭐ Subs
            </button>
            <button class="mode-chip follow-mode-btn ${this.channel.followOnly ? 'active' : ''}" data-mode="follow" title="Solo Seguidores pueden chatear">
              👥 Follow
            </button>
            <button class="mode-chip emote-mode-btn ${this.channel.emoteOnly ? 'active' : ''}" data-mode="emote" title="Solo Emotes">
              😀 Emotes
            </button>
          </div>
          <div class="room-status-indicator mono" style="font-size: 10px; color: var(--text-dim);">
            ID: ${this.channel.id}
          </div>
        </div>
      ` : `
        <div class="room-modes-bar not-mod" style="background: rgba(255, 255, 255, 0.02); justify-content: space-between;">
          <span style="font-size: 11px; color: var(--text-dim); display: flex; align-items: center; gap: 5px;">
            👁️ <strong style="color: #d1d8e0;">Modo Stream</strong> (Solo lectura / Sin permisos de moderación)
          </span>
          <div class="room-status-indicator mono" style="font-size: 10px; color: var(--text-dim);">
            ID: ${this.channel.id}
          </div>
        </div>
      `}

      <!-- Quick Chat Filter Chips -->
      <div class="chat-filters-bar">
        <button class="chat-filter-chip active" data-filter="all">Todos</button>
        <button class="chat-filter-chip" data-filter="mentions">@ Menciones</button>
        <button class="chat-filter-chip" data-filter="first">✨ Primerizos</button>
        <button class="chat-filter-chip" data-filter="subs">⭐ Subs</button>
      </div>

      <!-- Chat Feed Container (Pure Live Visualization & Mod Actions) -->
      <div class="channel-chat-section">
        <div class="chat-messages-container"></div>
        <div class="chat-paused-pill ${this.channel.platform}" style="display: none;">
          ↓ Mensajes nuevos (${this.unreadCountWhilePaused})
        </div>
      </div>
    `;

    this.element = card;
    this.messagesContainer = card.querySelector('.chat-messages-container');
    this.pausedIndicator = card.querySelector('.chat-paused-pill');

    this._bindEvents();
    return card;
  }

  _bindEvents() {
    const playerContainer = this.element.querySelector('.channel-player-container');
    const videoBtn = this.element.querySelector('.video-toggle-btn');
    const audioBtn = this.element.querySelector('.audio-toggle-btn');
    const reloadBtn = this.element.querySelector('.reload-player-btn');

    const reloadPlayer = () => {
      if (!this.channel.videoEnabled) return;

      if (this.channel.platform === 'twitch') {
        const initialized = this._initTwitchEmbedPlayer(playerContainer);
        if (initialized) return;
      }

      const src = this._getPlayerIframeSrc();
      playerContainer.innerHTML = `<iframe class="channel-player-iframe" src="${src}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture;" allowfullscreen="true" frameborder="0" scrolling="no"></iframe>`;
      const iframe = playerContainer.querySelector('iframe');
      if (iframe) {
        if (this.channel.platform === 'kick') {
          iframe.addEventListener('load', () => this._cleanKickIframe(iframe));
        } else if (this.channel.platform === 'twitch') {
          iframe.addEventListener('load', () => this._cleanTwitchIframe(iframe));
        }
      }
    };

    // Auto initialize player on mount
    if (this.channel.videoEnabled) {
      setTimeout(() => reloadPlayer(), 50);
    }

    // 1. Audio Toggle (Mute / Unmute stream on Kick and Twitch)
    audioBtn?.addEventListener('click', () => {
      this.channel.audioEnabled = !this.channel.audioEnabled;

      // If video was collapsed/disabled, enable video so user can hear the audio
      if (this.channel.audioEnabled && !this.channel.videoEnabled) {
        this.channel.videoEnabled = true;
        if (videoBtn) {
          videoBtn.classList.add('active');
          videoBtn.title = 'Ocultar Video Player';
        }
        playerContainer.classList.remove('collapsed');
        reloadPlayer();
      }

      // Update Audio button icon & title
      audioBtn.classList.toggle('active', this.channel.audioEnabled);
      audioBtn.title = this.channel.audioEnabled ? 'Silenciar Audio' : 'Activar Sonido (Unmute)';
      audioBtn.innerHTML = this.channel.audioEnabled ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      ` : `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      `;

      // Seamless in-place unmuting without destroying video context (prevents Error #1000)
      if (this.channel.platform === 'twitch') {
        if (this.twitchPlayer) {
          try {
            this.twitchPlayer.setMuted(!this.channel.audioEnabled);
            if (this.channel.audioEnabled) {
              this.twitchPlayer.setVolume(1.0);
            }
          } catch (e) {
            console.warn('[Twitch setMuted error]', e);
          }
        } else {
          // Fallback: try postMessage or lazy reload
          const iframe = playerContainer.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            try {
              iframe.contentWindow.postMessage({
                eventName: 'setMuted',
                params: { muted: !this.channel.audioEnabled }
              }, '*');
            } catch (e) {}
          }
        }
      } else {
        // Kick
        reloadPlayer();
      }
    });

    // 2. Video Toggle (Dynamic creation / destruction to prevent memory leaks and WebGL context limits)
    videoBtn?.addEventListener('click', () => {
      this.channel.videoEnabled = !this.channel.videoEnabled;
      videoBtn.classList.toggle('active', this.channel.videoEnabled);
      videoBtn.title = this.channel.videoEnabled ? 'Ocultar Video Player' : 'Cargar Video Player';
      playerContainer.classList.toggle('collapsed', !this.channel.videoEnabled);

      if (this.channel.videoEnabled) {
        reloadPlayer();
      } else {
        // If video disabled, mute audio button as well
        this.channel.audioEnabled = false;
        this.twitchPlayer = null;
        if (audioBtn) {
          audioBtn.classList.remove('active');
          audioBtn.title = 'Activar Sonido (Unmute)';
          audioBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
        }
        playerContainer.innerHTML = `
          <div class="video-placeholder-lazy" style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); font-size: 11.5px; gap: 8px;">
            <span>📹 Modo Chat Ligero (Haz clic en el ícono de cámara arriba para cargar video)</span>
          </div>
        `;
      }
    });

    // 3. Reload Player (Fixes any stalled HLS download or Error #1000)
    reloadBtn?.addEventListener('click', () => {
      reloadPlayer();
    });

    // Clear Chat
    this.element.querySelector('.clear-chat-btn').addEventListener('click', () => {
      this.clearMessages();
      if (this.options.onToggleMode) {
        this.options.onToggleMode(this.channel, 'clear');
      }
    });

    // Move Panel Position Buttons
    this.element.querySelector('.move-left-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.options.onMoveStep) {
        this.options.onMoveStep(this.channel.id, -1);
      }
    });

    this.element.querySelector('.move-right-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.options.onMoveStep) {
        this.options.onMoveStep(this.channel.id, 1);
      }
    });

    // Drag and Drop Panel Reordering
    const cardEl = this.element;
    cardEl.setAttribute('draggable', 'true');

    cardEl.addEventListener('dragstart', (e) => {
      if (e.target.closest('input, button, select, textarea, .chat-messages-container, .player-mount-area, iframe')) {
        e.preventDefault();
        return;
      }
      cardEl.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.channel.id);
      window.__draggedChannelId = this.channel.id;
    });

    cardEl.addEventListener('dragend', () => {
      cardEl.classList.remove('is-dragging');
      document.querySelectorAll('.channel-card').forEach(el => {
        el.classList.remove('drag-over-before', 'drag-over-after');
      });
      window.__draggedChannelId = null;
    });

    cardEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const draggedId = window.__draggedChannelId || e.dataTransfer.getData('text/plain');
      if (draggedId === this.channel.id) return;

      const rect = cardEl.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const isAfter = e.clientX > midpoint;

      cardEl.classList.toggle('drag-over-before', !isAfter);
      cardEl.classList.toggle('drag-over-after', isAfter);
    });

    cardEl.addEventListener('dragleave', () => {
      cardEl.classList.remove('drag-over-before', 'drag-over-after');
    });

    cardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      cardEl.classList.remove('drag-over-before', 'drag-over-after');
      const sourceId = window.__draggedChannelId || e.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === this.channel.id) return;

      const rect = cardEl.getBoundingClientRect();
      const isAfter = e.clientX > (rect.left + rect.width / 2);
      if (this.options.onReorder) {
        this.options.onReorder(sourceId, this.channel.id, isAfter);
      }
    });

    // Remove Channel
    this.element.querySelector('.remove-channel-btn').addEventListener('click', () => {
      if (this.options.onRemoveChannel) {
        this.options.onRemoveChannel(this.channel.id);
      }
    });

    // Room Mode Chips
    this.element.querySelectorAll('.mode-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const mode = chip.dataset.mode;
        chip.classList.toggle('active');
        if (mode === 'slow') {
          this.channel.slowMode = chip.classList.contains('active') ? 5 : 0;
          chip.textContent = this.channel.slowMode ? `⏱️ Slow 5s` : '⏱️ Slow Off';
        } else if (mode === 'sub') {
          this.channel.subOnly = chip.classList.contains('active');
        } else if (mode === 'follow') {
          this.channel.followOnly = chip.classList.contains('active');
        } else if (mode === 'emote') {
          this.channel.emoteOnly = chip.classList.contains('active');
        }

        if (this.options.onToggleMode) {
          this.options.onToggleMode(this.channel, mode, chip.classList.contains('active'));
        }
      });
    });

    // Chat Quick Filter Chips
    this.activeFilter = 'all';
    this.element.querySelectorAll('.chat-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.element.querySelectorAll('.chat-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.filter;
        this._applyChatFilter();
      });
    });

    // Scroll handling for paused chat
    this.messagesContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;

      if (isAtBottom) {
        this.isScrolledUp = false;
        this.unreadCountWhilePaused = 0;
        this.pausedIndicator.style.display = 'none';
      } else {
        this.isScrolledUp = true;
      }
    });

    // Click on paused indicator to snap to bottom
    this.pausedIndicator.addEventListener('click', () => {
      this.scrollToBottom();
    });

  }

  _applyChatFilter() {
    const msgs = this.messagesContainer.querySelectorAll('.chat-message');
    msgs.forEach(msgEl => {
      if (this.activeFilter === 'all') {
        msgEl.style.display = 'block';
      } else if (this.activeFilter === 'mentions') {
        msgEl.style.display = msgEl.classList.contains('highlight-mention') ? 'block' : 'none';
      } else if (this.activeFilter === 'first') {
        msgEl.style.display = msgEl.classList.contains('first-message') ? 'block' : 'none';
      } else if (this.activeFilter === 'subs') {
        const hasSub = msgEl.querySelector('.badge-subscriber');
        msgEl.style.display = hasSub ? 'block' : 'none';
      }
    });
  }

  addMessage(msgObj) {
    const isAtBottom = !this.isScrolledUp;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message';
    msgEl.id = `msg-${msgObj.id}`;
    msgEl.dataset.msgId = msgObj.id;
    msgEl.dataset.username = msgObj.username;

    if (msgObj.isFirstMessage) msgEl.classList.add('first-message');
    if (msgObj.highlighted) msgEl.classList.add('highlight-mention');

    const timeString = new Date(msgObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const badgesHtml = renderBadgesHTML(msgObj.platform, msgObj.badges);
    const userColor = msgObj.color || (msgObj.platform === 'kick' ? '#53fc18' : '#9146ff');

    msgEl.innerHTML = `
      <span class="msg-time">${timeString}</span>
      <span class="msg-badges">${badgesHtml}</span>
      <span class="msg-username" style="color: ${userColor}">${msgObj.displayName || msgObj.username}</span><span class="msg-colon">:</span>
      <span class="message-body">${this._escapeHtml(msgObj.text)}</span>

      <!-- Hover Action Bar -->
      <div class="msg-actions-hover">
        <button class="msg-action-btn delete-btn" title="Eliminar Mensaje (Delete)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6"/></svg>
        </button>
        <button class="msg-action-btn timeout-btn" title="Sancionar / Timeout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </button>
        <button class="msg-action-btn ban-btn" title="Banear Usuario Permanentemente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        </button>
        <button class="msg-action-btn inspect-btn" title="Inspeccionar Perfil y Notas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>
    `;

    this._bindMessageEvents(msgEl, msgObj);

    this.messagesContainer.appendChild(msgEl);
    this.messages.push(msgObj);

    // Prune excess messages to maintain 60FPS performance
    if (this.messagesContainer.children.length > this.maxMessages) {
      this.messagesContainer.removeChild(this.messagesContainer.firstElementChild);
      this.messages.shift();
    }

    if (isAtBottom) {
      this.scrollToBottom();
    } else {
      this.unreadCountWhilePaused++;
      this.pausedIndicator.style.display = 'flex';
      this.pausedIndicator.textContent = `↓ Mensajes nuevos (${this.unreadCountWhilePaused})`;
    }
  }

  _bindMessageEvents(msgEl, msgObj) {
    // Delete message
    msgEl.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.markMessageDeleted(msgObj.id);
      if (this.options.onDelete) {
        this.options.onDelete(this.channel, msgObj);
      }
    });

    // Timeout with quick duration popover
    const timeoutBtn = msgEl.querySelector('.timeout-btn');
    timeoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showTimeoutMenu(timeoutBtn, msgObj);
    });

    // Ban user
    msgEl.querySelector('.ban-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Estás seguro de banear permanentemente a @${msgObj.username} en #${this.channel.name}?`)) {
        if (this.options.onBan) {
          this.options.onBan(this.channel, msgObj);
        }
      }
    });

    // Inspect user
    const handleInspect = (e) => {
      e.stopPropagation();
      if (this.options.onInspect) {
        this.options.onInspect(msgObj, this.channel, this.messages);
      }
    };

    msgEl.querySelector('.inspect-btn').addEventListener('click', handleInspect);
    msgEl.querySelector('.msg-username').addEventListener('click', handleInspect);
  }

  _showTimeoutMenu(anchorBtn, msgObj) {
    // Remove existing popovers
    document.querySelectorAll('.timeout-dropdown-menu').forEach(el => el.remove());

    const menu = document.createElement('div');
    menu.className = 'timeout-dropdown-menu';

    const durations = [
      { label: '1 Seg (Purge)', val: 1 },
      { label: '60 Seg (1m)', val: 60 },
      { label: '5 Minutos', val: 300 },
      { label: '10 Minutos', val: 600 },
      { label: '1 Hora', val: 3600 },
      { label: '24 Horas', val: 86400 }
    ];

    durations.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'timeout-opt-btn';
      btn.textContent = d.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
        if (this.options.onTimeout) {
          this.options.onTimeout(this.channel, msgObj, d.val);
        }
      });
      menu.appendChild(btn);
    });

    anchorBtn.parentElement.appendChild(menu);

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  }

  markMessageDeleted(msgId) {
    const el = this.element.querySelector(`#msg-${msgId}`);
    if (el) {
      el.classList.add('deleted');
      const body = el.querySelector('.message-body');
      if (body) {
        body.innerHTML = `<em><strike>${body.innerHTML}</strike> <span style="font-size:10px; color:var(--danger-red);">(Eliminado por moderador)</span></em>`;
      }
    }
  }

  clearMessages() {
    this.messagesContainer.innerHTML = `
      <div class="chat-message system-msg">
        🛡️ El chat ha sido limpiado por un moderador.
      </div>
    `;
    this.messages = [];
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    this.isScrolledUp = false;
    this.unreadCountWhilePaused = 0;
    this.pausedIndicator.style.display = 'none';
  }

  _cleanKickIframe(iframe) {
    if (this.channel.platform !== 'kick' || !iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        // Target Kick's top banner controls and bottom watermark overlay
        const topHeader = doc.querySelector('.z-controls, [class*="z-controls"], [class*="bg-linear-to-b"]');
        if (topHeader) topHeader.style.display = 'none';

        const bottomBadge = doc.querySelector('[class*="bottom-12"][class*="right-4"], [class*="bg-neutral-950/70"]');
        if (bottomBadge) bottomBadge.style.display = 'none';

        // Inject stylesheet to permanently suppress these classes
        const style = doc.createElement('style');
        style.textContent = `
          .absolute.top-0.right-0.left-0.z-controls,
          .z-controls,
          [class*="z-controls"],
          [class*="bg-linear-to-b"][class*="from-neutral-950"],
          .absolute.right-4.bottom-12,
          [class*="right-4"][class*="bottom-12"],
          [class*="bg-neutral-950/70"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
          }
        `;
        doc.head?.appendChild(style);
      }
    } catch (e) {
      // Handled gracefully via outer CSS styling
    }
  }

  _cleanTwitchIframe(iframe) {
    if (this.channel.platform !== 'twitch' || !iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const overlay = doc.querySelector('.ScTransitionBase-sc-hx4quq-0, .fhZWme, .tw-transition, [class*="ScTransitionBase"], [class*="fhZWme"]');
        if (overlay) overlay.style.display = 'none';

        const style = doc.createElement('style');
        style.textContent = `
          .ScTransitionBase-sc-hx4quq-0,
          .fhZWme,
          .tw-transition,
          .ScTransitionBase-sc-hx4quq-0.fhZWme.tw-transition,
          [class*="ScTransitionBase"],
          [class*="fhZWme"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
          }
        `;
        doc.head?.appendChild(style);
      }
    } catch (e) {
      // Handled gracefully via outer CSS styling
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
