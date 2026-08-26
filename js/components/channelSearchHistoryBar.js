/**
 * ORBIMOD DECK — TOP BAR CHANNEL SEARCH & MODERATED HISTORY COMPONENT
 * Instant inline channel search, platform selector (Twitch/Kick), 
 * live stream status check, and full moderated channels history dropdown.
 */

import { apiService } from '../services/apiService.js';
import { storageService } from '../services/storageService.js';

export class ChannelSearchHistoryBar {
  constructor({ container, getActiveChannels, onAddChannel, onRemoveChannel, onChannelsUpdated, onHistoryUpdated, showToast }) {
    this.container = container;
    this.getActiveChannels = getActiveChannels;
    this.onAddChannel = onAddChannel;
    this.onRemoveChannel = onRemoveChannel;
    this.onChannelsUpdated = onChannelsUpdated;
    this.onHistoryUpdated = onHistoryUpdated;
    this.showToast = showToast || console.log;

    this.selectedPlatform = 'twitch'; // 'twitch' | 'kick'
    this.isHistoryOpen = false;
    this.filterTab = 'all'; // 'all' | 'live' | 'offline' | 'twitch' | 'kick'

    this.render();
  }

  render() {
    const history = storageService.getChannelHistory() || [];
    const activeChannels = this.getActiveChannels() || [];
    const activeIds = new Set(activeChannels.map(c => c.id));

    this.container.innerHTML = `
      <div class="deck-channel-search-wrapper" id="deck-channel-search-wrapper">
        <!-- Search Input Bar -->
        <div class="deck-search-box">
          <!-- Platform Switcher Chips -->
          <div class="deck-search-platform-toggle" id="deck-search-platform-toggle">
            <button type="button" class="btn-platform-chip ${this.selectedPlatform === 'twitch' ? 'active twitch' : ''}" data-platform="twitch" title="Buscar en Twitch">
              <svg viewBox="0 0 24 24" class="platform-icon-svg"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
              <span>Twitch</span>
            </button>
            <button type="button" class="btn-platform-chip ${this.selectedPlatform === 'kick' ? 'active kick' : ''}" data-platform="kick" title="Buscar en Kick">
              <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kick-streaming-platform-logo-icon.png" style="width: 14px; height: 14px; object-fit: contain;" alt="Kick">
              <span>Kick</span>
            </button>
          </div>

          <!-- Input Field -->
          <div class="deck-search-input-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="deck-search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="deck-channel-search-input" class="deck-search-input" placeholder="Buscar canal en ${this.selectedPlatform.toUpperCase()} (ej. ${this.selectedPlatform === 'twitch' ? 'ibai, rubius' : 'westcol, xqc'})..." autocomplete="off" />
            <button id="btn-deck-search-add" class="btn-search-add-action" title="Añadir canal al Deck">+ Añadir</button>
          </div>

          <!-- History Popover Button -->
          <button id="btn-toggle-channel-history" class="btn btn-secondary btn-history-dropdown-toggle ${this.isHistoryOpen ? 'active' : ''}" title="Ver Historial de Canales Moderados">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Historial (<span id="history-total-count">${history.length}</span>)</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-history-icon ${this.isHistoryOpen ? 'open' : ''}"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>

        <!-- Moderated Channels History Popover Dropdown -->
        <div id="deck-channel-history-popover" class="deck-channel-history-popover ${this.isHistoryOpen ? 'open' : ''}">
          ${this._renderHistoryDropdownContent(history, activeIds)}
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _renderHistoryDropdownContent(history, activeIds) {
    if (!this.isHistoryOpen) return '';

    let filtered = history;
    if (this.filterTab === 'live') filtered = history.filter(c => Boolean(c.isLive));
    else if (this.filterTab === 'offline') filtered = history.filter(c => !Boolean(c.isLive));
    else if (this.filterTab === 'twitch') filtered = history.filter(c => c.platform === 'twitch');
    else if (this.filterTab === 'kick') filtered = history.filter(c => c.platform === 'kick');

    const liveCount = history.filter(c => Boolean(c.isLive)).length;
    const offlineCount = history.filter(c => !Boolean(c.isLive)).length;

    return `
      <div class="history-popover-header">
        <div class="history-popover-title-row">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px;">📋</span>
            <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #fff;">Historial de Canales Moderados</h4>
          </div>
          <div class="history-header-actions">
            <button id="btn-history-sync-twitch" class="btn-history-tool" title="Sincronizar canales moderados de Twitch">⚡ Sync Twitch</button>
            <button id="btn-history-refresh-live" class="btn-history-tool" title="Actualizar estado en vivo">🔄 Actualizar</button>
            <button id="btn-history-clear-all" class="btn-history-tool danger" title="Vaciar historial">🗑️ Vaciar</button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="history-filter-tabs">
          <button class="tab-chip ${this.filterTab === 'all' ? 'active' : ''}" data-tab="all">Todos (${history.length})</button>
          <button class="tab-chip ${this.filterTab === 'live' ? 'active' : ''}" data-tab="live">🔴 En Vivo (${liveCount})</button>
          <button class="tab-chip ${this.filterTab === 'offline' ? 'active' : ''}" data-tab="offline">⚪ Offline (${offlineCount})</button>
          <button class="tab-chip ${this.filterTab === 'twitch' ? 'active' : ''}" data-tab="twitch">🟣 Twitch</button>
          <button class="tab-chip ${this.filterTab === 'kick' ? 'active' : ''}" data-tab="kick">🟢 Kick</button>
        </div>
      </div>

      <!-- History Channel Items List -->
      <div class="history-items-list">
        ${filtered.length === 0 ? `
          <div class="history-empty-notice">
            <span>📡</span>
            <div style="font-weight: 600; color: #fff;">No hay canales en esta sección</div>
            <div style="font-size: 11px; color: var(--text-dim);">Escribe el nombre de un canal arriba para buscarlo y añadirlo automáticamente al historial.</div>
          </div>
        ` : filtered.map(ch => {
          const inDeck = activeIds.has(ch.id);
          const isLive = Boolean(ch.isLive);
          const roleLabel = ch.role === 'owner' ? '👑 Propietario' : (ch.isModerator ? '🛡️ Mod' : 'Espectador');

          return `
            <div class="history-channel-row ${ch.platform} ${isLive ? 'is-live' : 'is-offline'}" data-id="${ch.id}">
              <div class="history-row-left">
                <img src="${ch.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop'}" class="history-avatar ${ch.platform}" alt="${ch.name}">
                <div class="history-chan-meta">
                  <div class="history-chan-name">
                    <span>#${ch.name}</span>
                    <span class="platform-badge-mini ${ch.platform}">${ch.platform.toUpperCase()}</span>
                    <span class="role-badge-mini ${ch.isModerator ? 'mod' : 'viewer'}">${roleLabel}</span>
                  </div>
                  <div class="history-chan-status">
                    ${isLive 
                      ? `<span class="live-dot-mini">●</span><span style="color:var(--danger-red); font-weight:700;">EN VIVO</span> <span>${Number(ch.viewers || 0).toLocaleString()} viewers</span>`
                      : `<span style="color:var(--text-dim);">⚪ Fuera de línea (Offline)</span>`
                    }
                  </div>
                </div>
              </div>

              <div class="history-row-right">
                <button class="btn-history-deck-toggle ${inDeck ? 'in-deck' : 'add-deck'}" data-id="${ch.id}" title="${inDeck ? 'Quitar del Deck actual' : 'Añadir al Deck actual'}">
                  ${inDeck ? '✓ En Deck' : '+ Añadir'}
                </button>
                <button class="btn-history-delete-item" data-id="${ch.id}" title="Eliminar de historial">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _bindEvents() {
    // 1. Platform Switcher
    this.container.querySelectorAll('.btn-platform-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPlatform = btn.dataset.platform;
        this.render();
        this.container.querySelector('#deck-channel-search-input')?.focus();
      });
    });

    // 2. Search & Add
    const searchInput = this.container.querySelector('#deck-channel-search-input');
    const searchBtn = this.container.querySelector('#btn-deck-search-add');

    const handleSearchAdd = async () => {
      const name = searchInput?.value.trim().toLowerCase().replace(/[@#]/g, '');
      if (!name) return;

      if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Buscando...';
      }

      let res;
      if (this.selectedPlatform === 'twitch') {
        res = await apiService.fetchTwitchChannel(name);
        if (res.success) {
          if (searchBtn) searchBtn.textContent = 'Comprobando Mod...';
          const twitchMod = await apiService.checkTwitchModStatus(name);
          res.channel.isModerator = twitchMod.isMod;
          res.channel.role = twitchMod.role;
        }
      } else {
        res = await apiService.fetchKickChannel(name);

        if (res.success) {
          if (searchBtn) searchBtn.textContent = 'Comprobando Mod...';
          const modCheck = await apiService.checkKickModStatus(name);

          if (modCheck.isMod) {
            res.channel.isModerator = true;
            res.channel.role = modCheck.isOwner ? 'owner' : 'mod';
          } else {
            res.channel.isModerator = false;
            res.channel.role = 'viewer';
          }
        }
      }

      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent = '+ Añadir';
      }

      if (!res.success) {
        alert(res.error || `No se pudo encontrar el canal #${name} en ${this.selectedPlatform.toUpperCase()}`);
        return;
      }

      // Add to persistent History
      storageService.addToHistory(res.channel);

      // Add to active deck
      if (this.onAddChannel) {
        this.onAddChannel(res.channel);
      }

      if (searchInput) searchInput.value = '';
      this.showToast(`Canal #${name} añadido con éxito`, 'success');
      this.render();
    };

    searchBtn?.addEventListener('click', handleSearchAdd);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearchAdd();
    });

    // 3. Toggle History Popover
    this.container.querySelector('#btn-toggle-channel-history')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isHistoryOpen = !this.isHistoryOpen;
      this.render();
    });

    // Click Outside listener to close popover
    document.addEventListener('click', (e) => {
      if (this.isHistoryOpen && !this.container.contains(e.target)) {
        this.isHistoryOpen = false;
        this.render();
      }
    });

    // 4. History Tabs
    this.container.querySelectorAll('.tab-chip').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filterTab = tab.dataset.tab;
        this.render();
      });
    });

    // 5. Toggle Channel Deck In/Out from History
    this.container.querySelectorAll('.btn-history-deck-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const history = storageService.getChannelHistory() || [];
        const ch = history.find(c => c.id === id);
        if (!ch) return;

        const activeChannels = this.getActiveChannels() || [];
        const inDeck = activeChannels.some(c => c.id === id);

        if (inDeck) {
          if (this.onRemoveChannel) this.onRemoveChannel(id);
          this.showToast(`Canal #${ch.name} removido del Deck`, 'info');
        } else {
          if (this.onAddChannel) this.onAddChannel(ch);
          this.showToast(`Canal #${ch.name} añadido al Deck`, 'success');
        }
        this.render();
      });
    });

    // 6. Delete from History
    this.container.querySelectorAll('.btn-history-delete-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        storageService.removeFromHistory(id);
        if (this.onHistoryUpdated) this.onHistoryUpdated();
        this.render();
      });
    });

    // 7. Sync Moderated Channels (Twitch)
    this.container.querySelector('#btn-history-sync-twitch')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const profiles = storageService.getProfiles();
      const creds = storageService.getAuthCreds();
      const token = profiles.twitch?.token || creds.twitchToken;
      const clientId = profiles.twitch?.clientId || apiService.getTwitchClientId();
      const userId = profiles.twitch?.userId;

      if (!token || !userId) {
        alert('Debes iniciar sesión con Twitch OAuth primero para sincronizar tus canales moderados.');
        return;
      }

      const syncBtn = this.container.querySelector('#btn-history-sync-twitch');
      if (syncBtn) syncBtn.textContent = 'Sincronizando...';

      const res = await apiService.fetchModeratedChannels(token, clientId, userId);
      if (res.success && res.channels.length > 0) {
        res.channels.forEach(ch => storageService.addToHistory(ch));
        if (this.onHistoryUpdated) this.onHistoryUpdated();
        this.showToast(`⚡ Se sincronizaron ${res.channels.length} canales en tu historial`, 'success');
      } else {
        alert(res.error || 'No se encontraron canales moderados en esta cuenta de Twitch.');
      }
      this.render();
    });

    // 8. Refresh Live Status
    this.container.querySelector('#btn-history-refresh-live')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const refreshBtn = this.container.querySelector('#btn-history-refresh-live');
      if (refreshBtn) refreshBtn.textContent = 'Actualizando...';

      let history = storageService.getChannelHistory() || [];
      if (history.length > 0) {
        history = await apiService.checkLiveStatus(history);
        storageService.saveChannelHistory(history);
        if (this.onHistoryUpdated) this.onHistoryUpdated();
      }
      this.showToast('Estados en vivo actualizados', 'info');
      this.render();
    });

    // 9. Clear History
    this.container.querySelector('#btn-history-clear-all')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('¿Deseas vaciar todo tu historial de canales guardados?')) {
        storageService.clearHistory();
        if (this.onHistoryUpdated) this.onHistoryUpdated();
        this.showToast('Historial vaciado', 'info');
        this.render();
      }
    });
  }
}
