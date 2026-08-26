/**
 * ORBIMOD — REAL MODERATOR AUDIT LOG DRAWER
 * Official Real-time Moderation Activity Feed (Twitch & Kick Mod View)
 * Displays actions separated per channel with exact moderator names, timeout durations, and ban details.
 */

import { storageService } from '../services/storageService.js';

export class AuditLogDrawer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = options; // { getChannels, showToast }
    this.filterPlatform = 'ALL'; // 'ALL' | 'twitch' | 'kick'
    this.filterAction = 'ALL';
    this.selectedChannelTab = 'ALL'; // 'ALL' or channel name
    this.searchQuery = '';

    // Auto-update in real-time without reloading the page
    storageService.onAuditLogChange(() => {
      if (this.isOpen()) {
        this.render();
      }
    });
  }

  isOpen() {
    return Boolean(this.container && this.container.classList.contains('open'));
  }

  open() {
    this.render();
    this.container.classList.add('open');
    document.getElementById('drawer-backdrop')?.classList.add('active');
  }

  close() {
    this.container.classList.remove('open');
    document.getElementById('drawer-backdrop')?.classList.remove('active');
  }

  render() {
    const allLogs = storageService.getAuditLogs();
    const channels = (this.options.getChannels ? this.options.getChannels() : []) || [];

    // Distinct list of channels present in logs or deck
    const channelMap = new Map();
    channels.forEach(c => {
      channelMap.set(c.name.toLowerCase(), { name: c.name, platform: c.platform, count: 0 });
    });
    allLogs.forEach(l => {
      if (l.channel) {
        const cKey = l.channel.toLowerCase();
        if (!channelMap.has(cKey)) {
          channelMap.set(cKey, { name: l.channel, platform: l.platform || 'twitch', count: 0 });
        }
        channelMap.get(cKey).count++;
      }
    });

    const activeChannelsList = Array.from(channelMap.values());

    const filtered = allLogs.filter(log => {
      if (this.filterPlatform !== 'ALL' && log.platform !== this.filterPlatform) return false;
      if (this.filterAction !== 'ALL' && log.action !== this.filterAction) return false;
      if (this.selectedChannelTab !== 'ALL' && log.channel?.toLowerCase() !== this.selectedChannelTab.toLowerCase()) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const target = (log.targetUser || '').toLowerCase();
        const mod = (log.mod || '').toLowerCase();
        const chan = (log.channel || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const reason = (log.reason || '').toLowerCase();
        if (!target.includes(q) && !mod.includes(q) && !chan.includes(q) && !details.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });

    this.container.innerHTML = `
      <!-- Header -->
      <div class="drawer-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-secondary);">
        <div class="drawer-title" style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; color: var(--accent-color, #00d2d3);" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <div>
            <span style="font-weight: 700; font-size: 14.5px; color: #fff;">Registro de Moderación Oficial</span>
            <div style="font-size: 11px; color: var(--success-green); display: flex; align-items: center; gap: 5px; margin-top: 2px;">
              <span class="metric-dot pulse" style="background: var(--success-green); width: 7px; height: 7px;"></span>
              <span>Mod View en Vivo • Twitch & Kick</span>
            </div>
          </div>
        </div>
        <button class="icon-btn-subtle close-drawer-btn" style="background: rgba(255,255,255,0.06); border: none; border-radius: 4px; padding: 6px; cursor: pointer; color: var(--text-dim);" title="Cerrar (ESC)">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Channel Separation Navigation Bar (Pills Tabs) -->
      <div style="background: rgba(0,0,0,0.4); border-bottom: 1px solid var(--border-subtle); padding: 8px 14px; display: flex; gap: 6px; overflow-x: auto; align-items: center; white-space: nowrap;">
        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-right: 4px;">Canal:</span>
        
        <button class="channel-tab-btn ${this.selectedChannelTab === 'ALL' ? 'active' : ''}" data-channel="ALL" style="background: ${this.selectedChannelTab === 'ALL' ? 'var(--twitch-purple, #9146ff)' : 'rgba(255,255,255,0.08)'}; color: #fff; border: 1px solid ${this.selectedChannelTab === 'ALL' ? '#bf94ff' : 'transparent'}; border-radius: 20px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;">
          <span>🌐 Todos</span>
          <span style="background: rgba(0,0,0,0.35); padding: 1px 6px; border-radius: 10px; font-size: 10px;">${allLogs.length}</span>
        </button>

        ${activeChannelsList.map(ch => {
          const isTwitch = ch.platform === 'twitch';
          const isSelected = this.selectedChannelTab.toLowerCase() === ch.name.toLowerCase();
          const themeBg = isTwitch ? 'rgba(145, 70, 255, 0.25)' : 'rgba(83, 252, 24, 0.25)';
          const activeBg = isTwitch ? '#9146ff' : '#2ecc71';
          const activeBorder = isTwitch ? '#bf94ff' : '#53fc18';

          return `
            <button class="channel-tab-btn ${isSelected ? 'active' : ''}" data-channel="${this._escapeHtml(ch.name)}" style="background: ${isSelected ? activeBg : themeBg}; color: #fff; border: 1px solid ${isSelected ? activeBorder : 'rgba(255,255,255,0.1)'}; border-radius: 20px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <span>${isTwitch ? '🟣' : '🟢'} #${this._escapeHtml(ch.name)}</span>
              <span style="background: rgba(0,0,0,0.4); padding: 1px 6px; border-radius: 10px; font-size: 10px;">${ch.count}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Drawer Body -->
      <div class="drawer-body" style="padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
        
        <!-- Search & Filter Controls -->
        <div style="display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <input type="text" class="form-input audit-search-input" placeholder="Buscar infractor (@usuario), moderador, motivo o canal..." value="${this._escapeHtml(this.searchQuery)}" style="width: 100%; font-size: 12px; padding: 8px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; color: #fff;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <!-- Platform filter -->
            <select class="form-select audit-platform-select" style="padding: 6px 8px; font-size: 11.5px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: #fff; border-radius: 4px;">
              <option value="ALL" ${this.filterPlatform === 'ALL' ? 'selected' : ''}>Todas Plataformas</option>
              <option value="twitch" ${this.filterPlatform === 'twitch' ? 'selected' : ''}>🟣 Solo Twitch</option>
              <option value="kick" ${this.filterPlatform === 'kick' ? 'selected' : ''}>🟢 Solo Kick</option>
            </select>

            <!-- Action type filter -->
            <select class="form-select audit-filter-select" style="padding: 6px 8px; font-size: 11.5px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: #fff; border-radius: 4px;">
              <option value="ALL" ${this.filterAction === 'ALL' ? 'selected' : ''}>Todas las Acciones</option>
              <option value="TIMEOUT" ${this.filterAction === 'TIMEOUT' ? 'selected' : ''}>⏱️ Timeouts / Silencios Temporales</option>
              <option value="BAN" ${this.filterAction === 'BAN' ? 'selected' : ''}>🔨 Vetos / Baneos Permanentes</option>
              <option value="UNBAN" ${this.filterAction === 'UNBAN' ? 'selected' : ''}>✓ Desbaneos</option>
              <option value="DELETE" ${this.filterAction === 'DELETE' ? 'selected' : ''}>🗑️ Mensajes Borrados</option>
              <option value="MODE_CHANGE" ${this.filterAction === 'MODE_CHANGE' ? 'selected' : ''}>⚙️ Ajustes de Sala / Modos</option>
            </select>
          </div>
        </div>

        <!-- Live Sync Header & Action Count -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-dim); padding: 0 2px;">
          <span>
            ${this.selectedChannelTab === 'ALL' ? `Mostrando <strong>${filtered.length}</strong> de ${allLogs.length} acciones` : `Canal <strong>#${this.selectedChannelTab}</strong> (${filtered.length} acciones)`}
          </span>
          <span class="mono" style="font-size: 10.5px; color: var(--success-green);">🟢 Tiempo Real</span>
        </div>

        <!-- Real Mod Logs List -->
        <div class="audit-logs-list" style="display: flex; flex-direction: column; gap: 8px;">
          ${filtered.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 45px 15px; font-size: 12.5px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px dashed var(--border-subtle);">
              <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
              <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Sin acciones registradas para este filtro</div>
              <div style="font-size: 11px; max-width: 320px; margin: 0 auto; color: var(--text-dim);">Cualquier sanción (timeouts con duración, vetos permanentes, mensajes borrados) ejecutada en Twitch o Kick aparecerá aquí en tiempo real de forma automática.</div>
            </div>
          ` : ''}

          ${filtered.map(log => this._renderLogCard(log)).join('')}
        </div>
      </div>

      <!-- Drawer Footer: Only Vaciar Historial Button as requested -->
      <div class="drawer-footer" style="padding: 12px 18px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.25);">
        <button class="btn btn-secondary clear-audit-btn" style="color: var(--danger-red); font-size: 12px; font-weight: 600; padding: 8px 18px; width: 100%; justify-content: center; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.08);">
          <svg viewBox="0 0 24 24" style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Vaciar Historial</span>
        </button>
      </div>
    `;

    this._bindEvents();
  }

  _renderLogCard(log) {
    const isTwitch = log.platform === 'twitch';
    const timeDate = new Date(log.timestamp);
    const timeStr = !isNaN(timeDate) ? timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const relativeTime = this._getRelativeTime(timeDate);

    let badgeBg = 'rgba(255, 170, 0, 0.15)';
    let badgeColor = '#ffa502';
    let badgeText = '⏱️ TIMEOUT';
    let actionTitle = 'Silencio Temporal';

    // Exact duration display
    if (log.action === 'TIMEOUT') {
      const dur = log.duration;
      if (dur) {
        badgeText = `⏱️ TIMEOUT (${dur >= 60 ? Math.round(dur / 60) + 'm' : dur + 's'})`;
        actionTitle = `Silenciado por ${dur >= 60 ? Math.round(dur / 60) + ' minutos (' + dur + 's)' : dur + ' segundos'}`;
      } else {
        badgeText = '⏱️ TIMEOUT';
        actionTitle = 'Silenciado temporalmente';
      }
    } else if (log.action === 'BAN') {
      badgeBg = 'rgba(255, 71, 87, 0.18)';
      badgeColor = '#ff4757';
      badgeText = '🔨 VETO PERMANENTE';
      actionTitle = 'Veto / Baneo Permanente del Canal';
    } else if (log.action === 'UNBAN') {
      badgeBg = 'rgba(46, 213, 115, 0.15)';
      badgeColor = '#2ed573';
      badgeText = '✓ DESBANEO';
      actionTitle = 'Usuario desbaneado';
    } else if (log.action === 'DELETE') {
      badgeBg = 'rgba(112, 161, 255, 0.15)';
      badgeColor = '#70a1ff';
      badgeText = '🗑️ MENSAJE BORRADO';
      actionTitle = 'Mensaje eliminado en chat';
    } else if (log.action === 'SHIELD') {
      badgeBg = 'rgba(255, 71, 87, 0.2)';
      badgeColor = '#ff4757';
      badgeText = '🛡️ MODO ESCUDO';
      actionTitle = 'Escudo de seguridad activado';
    } else if (log.action === 'MODE_CHANGE') {
      badgeBg = 'rgba(0, 210, 211, 0.15)';
      badgeColor = '#00d2d3';
      badgeText = '⚙️ MODO SALA';
      actionTitle = 'Modos de chat actualizados';
    }

    const channelName = log.channel || (isTwitch ? 'twitch' : 'kick');
    const modName = log.mod || (isTwitch ? 'Moderador Twitch' : 'Moderador Kick');
    const targetUser = log.targetUser;

    return `
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 11px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; transition: border-color 0.2s ease;">
        
        <!-- Card Top Bar: Action badge, Channel badge, Timestamp -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2.5px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">${badgeText}</span>
            <span class="channel-tag ${isTwitch ? 'badge-twitch' : 'badge-kick'}" style="font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">
              ${isTwitch ? '🟣' : '🟢'} #${this._escapeHtml(channelName)}
            </span>
          </div>
          <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono, monospace);" title="${log.timestamp}">
            ${timeStr} <small style="opacity:0.75;">(${relativeTime})</small>
          </span>
        </div>

        <!-- Action Target & Details -->
        <div style="color: #fff; margin-top: 1px; line-height: 1.45;">
          ${targetUser ? `
            <div style="font-size: 12.5px; margin-bottom: 2px;">
              <span style="color: var(--text-dim);">Usuario sancionado:</span> 
              <strong style="color: #fff; background: rgba(255,255,255,0.07); padding: 1px 5px; border-radius: 3px;">@${this._escapeHtml(targetUser)}</strong>
            </div>
          ` : ''}
          <div style="color: var(--text-muted); font-size: 12px;">
            ${this._escapeHtml(log.details || actionTitle)}
          </div>
          ${log.reason && log.reason !== log.details ? `
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
              Motivo: <em style="color: #e0e0e0;">"${this._escapeHtml(log.reason)}"</em>
            </div>
          ` : ''}
        </div>

        <!-- Card Footer: Who executed the action & Platform -->
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 3px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
          <div>
            <span>Acción realizada por: </span>
            <strong style="color: ${isTwitch ? '#bf94ff' : '#53fc18'};">@${this._escapeHtml(modName)}</strong>
          </div>
          <span style="font-size: 9.5px; text-transform: uppercase; font-weight: 700; color: ${isTwitch ? '#bf94ff' : '#53fc18'}; background: rgba(255,255,255,0.04); padding: 1px 5px; border-radius: 3px;">${log.platform.toUpperCase()}</span>
        </div>

      </div>
    `;
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

    // Channel Tabs
    this.container.querySelectorAll('.channel-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedChannelTab = btn.dataset.channel;
        this.render();
      });
    });

    // Search input
    const searchInput = this.container.querySelector('.audit-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    // Platform select
    const platformSelect = this.container.querySelector('.audit-platform-select');
    platformSelect?.addEventListener('change', (e) => {
      this.filterPlatform = e.target.value;
      this.render();
    });

    // Action select
    const actionSelect = this.container.querySelector('.audit-filter-select');
    actionSelect?.addEventListener('change', (e) => {
      this.filterAction = e.target.value;
      this.render();
    });

    // Clear logs (Vaciar Historial)
    this.container.querySelector('.clear-audit-btn')?.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar todo el registro de auditoría de moderación?')) {
        storageService.clearAuditLogs();
        this.render();
        if (this.options.showToast) {
          this.options.showToast('Historial de moderación vaciado correctamente', 'info');
        }
      }
    });
  }

  _getRelativeTime(date) {
    if (!date || isNaN(date.getTime())) return '';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return 'ahora';
    if (diffSec < 60) return `hace ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${Math.floor(diffHours / 24)}d`;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}



