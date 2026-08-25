/**
 * NEXUS MOD DECK — CHANNEL CARD COMPONENT
 * Video stream embed, live chat feed, quick mod action overlays, room controls
 */

import { renderBadgesHTML } from '../data/defaultBadges.js';

export class ChannelCard {
  constructor(channel, options = {}) {
    this.channel = channel; // { id, name, platform, avatar, viewers, isLive, videoEnabled, slowMode, subOnly, followOnly, emoteOnly }
    this.options = options; // { onTimeout, onBan, onDelete, onInspect, onSendMessage, onToggleMode, onRemoveChannel }
    this.element = null;
    this.messagesContainer = null;
    this.pausedIndicator = null;
    this.isScrolledUp = false;
    this.unreadCountWhilePaused = 0;
    this.maxMessages = 120;
    this.messages = [];
  }

  render() {
    const card = document.createElement('div');
    card.className = `channel-card ${this.channel.platform}`;
    card.id = `channel-card-${this.channel.id}`;

    const isTwitch = this.channel.platform === 'twitch';
    const platformLabel = isTwitch ? 'Twitch' : 'Kick';
    const tagClass = isTwitch ? 'badge-twitch' : 'badge-kick';
    const host = window.location.hostname || 'localhost';
    // Build embed player URL with parent domains (support both localhost and github.io)
    let playerIframeSrc = '';
    if (isTwitch) {
      const parentParam = host === 'localhost' || host === '127.0.0.1' 
        ? `parent=localhost&parent=127.0.0.1` 
        : `parent=${host}`;
      playerIframeSrc = `https://player.twitch.tv/?channel=${this.channel.name}&${parentParam}&autoplay=false&muted=true`;
    } else {
      playerIframeSrc = `https://player.kick.com/${this.channel.name}?autoplay=false&muted=true`;
    }

    const hasVideo = !!this.channel.videoEnabled;

    card.innerHTML = `
      <!-- Header -->
      <div class="channel-header">
        <div class="channel-info">
          <img src="${this.channel.avatar || 'https://via.placeholder.com/26'}" class="channel-avatar ${this.channel.platform}" alt="${this.channel.name}" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop'">
          <div class="channel-name-block">
            <div class="channel-title">
              <span>#${this.channel.name}</span>
              <span class="channel-tag ${tagClass}">${platformLabel}</span>
            </div>
            <div class="channel-meta">
              <span class="live-badge">● LIVE CHAT</span>
              <span>${this.channel.viewers ? Number(this.channel.viewers).toLocaleString() + ' viewers' : 'Moderación Activa'}</span>
            </div>
          </div>
        </div>

        <div class="channel-actions">
          <button class="icon-btn-subtle video-toggle-btn ${hasVideo ? 'active' : ''}" title="${hasVideo ? 'Ocultar Video Player' : 'Cargar Video Player'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </button>
          <button class="icon-btn-subtle clear-chat-btn" title="Limpiar Chat (/clear)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
          </button>
          <button class="icon-btn-subtle remove-channel-btn" title="Cerrar Canal de la Vista">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Optional Stream Video Player with Lazy Load -->
      <div class="channel-player-container ${hasVideo ? '' : 'collapsed'}">
        ${hasVideo ? `
          <iframe class="channel-player-iframe" src="${playerIframeSrc}" loading="lazy" allow="autoplay; fullscreen" scrolling="no"></iframe>
        ` : `
          <div class="video-placeholder-lazy" style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); font-size: 11.5px; gap: 8px;">
            <span>📹 Modo Chat Ligero (Haz clic en el ícono de cámara arriba para cargar video)</span>
          </div>
        `}
      </div>

      <!-- Room Moderation Modes Bar -->
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

      <!-- Quick Chat Filter Chips -->
      <div class="chat-filters-bar">
        <button class="chat-filter-chip active" data-filter="all">Todos</button>
        <button class="chat-filter-chip" data-filter="mentions">@ Menciones</button>
        <button class="chat-filter-chip" data-filter="first">✨ Primerizos</button>
        <button class="chat-filter-chip" data-filter="subs">⭐ Subs</button>
      </div>

      <!-- Chat Feed Container -->
      <div class="channel-chat-section">
        <div class="chat-messages-container"></div>
        <div class="chat-paused-pill ${this.channel.platform}" style="display: none;">
          ↓ Mensajes nuevos (${this.unreadCountWhilePaused})
        </div>
      </div>

      <!-- Chat Composer & Quick Macros -->
      <div class="chat-composer-section">
        <div class="canned-macros-bar"></div>
        <div class="chat-input-wrapper">
          <input type="text" class="chat-input ${isTwitch ? '' : 'kick-input'}" placeholder="Enviar mensaje como Moderador a #${this.channel.name}..." maxlength="500">
          <button class="btn ${isTwitch ? 'btn-primary' : 'btn-kick'} btn-send-chat">
            <span>Enviar</span>
          </button>
        </div>
      </div>
    `;

    this.element = card;
    this.messagesContainer = card.querySelector('.chat-messages-container');
    this.pausedIndicator = card.querySelector('.chat-paused-pill');

    this._bindEvents();
    this._renderMacros();
    return card;
  }

  _bindEvents() {
    // Video Toggle (Dynamic creation / destruction to prevent memory leaks and WebGL context limits)
    const videoBtn = this.element.querySelector('.video-toggle-btn');
    const playerContainer = this.element.querySelector('.channel-player-container');

    videoBtn.addEventListener('click', () => {
      this.channel.videoEnabled = !this.channel.videoEnabled;
      videoBtn.classList.toggle('active', this.channel.videoEnabled);
      videoBtn.title = this.channel.videoEnabled ? 'Ocultar Video Player' : 'Cargar Video Player';
      playerContainer.classList.toggle('collapsed', !this.channel.videoEnabled);

      if (this.channel.videoEnabled) {
        const isTwitch = this.channel.platform === 'twitch';
        const host = window.location.hostname || 'localhost';
        const parentParam = host === 'localhost' || host === '127.0.0.1' 
          ? `parent=localhost&parent=127.0.0.1` 
          : `parent=${host}`;
        const src = isTwitch
          ? `https://player.twitch.tv/?channel=${this.channel.name}&${parentParam}&autoplay=false&muted=true`
          : `https://player.kick.com/${this.channel.name}?autoplay=false&muted=true`;
        playerContainer.innerHTML = `<iframe class="channel-player-iframe" src="${src}" loading="lazy" allow="autoplay; fullscreen" scrolling="no"></iframe>`;
      } else {
        playerContainer.innerHTML = `
          <div class="video-placeholder-lazy" style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-dim); font-size: 11.5px; gap: 8px;">
            <span>📹 Modo Chat Ligero (Haz clic en el ícono de cámara arriba para cargar video)</span>
          </div>
        `;
      }
    });

    // Clear Chat
    this.element.querySelector('.clear-chat-btn').addEventListener('click', () => {
      this.clearMessages();
      if (this.options.onToggleMode) {
        this.options.onToggleMode(this.channel, 'clear');
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

    // Chat Composer
    const chatInput = this.element.querySelector('.chat-input');
    const sendBtn = this.element.querySelector('.btn-send-chat');

    const handleSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      if (this.options.onSendMessage) {
        this.options.onSendMessage(this.channel, text);
      }
      chatInput.value = '';
    };

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSend();
      }
    });
  }

  _renderMacros() {
    const macroBar = this.element.querySelector('.canned-macros-bar');
    const macros = this.options.getMacros ? this.options.getMacros() : [];
    macroBar.innerHTML = '';

    macros.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'macro-chip-btn';
      btn.textContent = m.name;
      btn.title = `${m.text} (${m.hotkey || ''})`;
      btn.addEventListener('click', () => {
        if (this.options.onSendMessage) {
          this.options.onSendMessage(this.channel, m.text);
        }
      });
      macroBar.appendChild(btn);
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

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
