/**
 * ORBIMOD — REAL MODERATOR AUDIT LOG DRAWER
 * Official Real-time Moderation Activity Feed (Twitch & Kick Mod View)
 */

import { storageService } from '../services/storageService.js';

export class AuditLogDrawer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = options; // { onFetchRealLogs, getChannels }
    this.filterPlatform = 'ALL'; // 'ALL' | 'twitch' | 'kick'
    this.filterAction = 'ALL';
    this.filterChannel = 'ALL';
    this.searchQuery = '';
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

    const filtered = allLogs.filter(log => {
      if (this.filterPlatform !== 'ALL' && log.platform !== this.filterPlatform) return false;
      if (this.filterAction !== 'ALL' && log.action !== this.filterAction) return false;
      if (this.filterChannel !== 'ALL' && log.channel?.toLowerCase() !== this.filterChannel.toLowerCase()) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const target = (log.targetUser || '').toLowerCase();
        const mod = (log.mod || '').toLowerCase();
        const chan = (log.channel || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        if (!target.includes(q) && !mod.includes(q) && !chan.includes(q) && !details.includes(q)) {
          return false;
        }
      }
      return true;
    });

    this.container.innerHTML = `
      <div class="drawer-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
        <div class="drawer-title" style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" style="width: 18px; height: 18px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <div>
            <span style="font-weight: 700; font-size: 14px; color: #fff;">Registro de Moderación Real</span>
            <div style="font-size: 10.5px; color: var(--success-green); display: flex; align-items: center; gap: 5px; margin-top: 2px;">
              <span class="metric-dot pulse" style="background: var(--success-green); width: 6px; height: 6px;"></span>
              <span>Twitch & Kick Mod View en Vivo</span>
            </div>
          </div>
        </div>
        <button class="icon-btn-subtle close-drawer-btn" style="background: rgba(255,255,255,0.06); border: none; border-radius: 4px; padding: 6px; cursor: pointer; color: var(--text-dim);">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="drawer-body" style="padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
        <!-- Search & Filter Controls -->
        <div style="display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <input type="text" class="form-input audit-search-input" placeholder="Buscar por usuario infractor, moderador, motivo o canal..." value="${this._escapeHtml(this.searchQuery)}" style="width: 100%; font-size: 12px; padding: 8px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; color: #fff;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
            <!-- Platform filter -->
            <select class="form-select audit-platform-select" style="padding: 6px 8px; font-size: 11.5px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: #fff; border-radius: 4px;">
              <option value="ALL" ${this.filterPlatform === 'ALL' ? 'selected' : ''}>Todas Plataformas</option>
              <option value="twitch" ${this.filterPlatform === 'twitch' ? 'selected' : ''}>🟣 Solo Twitch</option>
              <option value="kick" ${this.filterPlatform === 'kick' ? 'selected' : ''}>🟢 Solo Kick</option>
            </select>

            <!-- Action type filter -->
            <select class="form-select audit-filter-select" style="padding: 6px 8px; font-size: 11.5px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: #fff; border-radius: 4px;">
              <option value="ALL" ${this.filterAction === 'ALL' ? 'selected' : ''}>Todas las Acciones</option>
              <option value="TIMEOUT" ${this.filterAction === 'TIMEOUT' ? 'selected' : ''}>⏱️ Timeouts / Silencios</option>
              <option value="BAN" ${this.filterAction === 'BAN' ? 'selected' : ''}>🔨 Baneos Permanentes</option>
              <option value="UNBAN" ${this.filterAction === 'UNBAN' ? 'selected' : ''}>✓ Desbaneos</option>
              <option value="DELETE" ${this.filterAction === 'DELETE' ? 'selected' : ''}>🗑️ Mensajes Borrados</option>
              <option value="MODE_CHANGE" ${this.filterAction === 'MODE_CHANGE' ? 'selected' : ''}>⚙️ Modos de Chat</option>
              <option value="SHIELD" ${this.filterAction === 'SHIELD' ? 'selected' : ''}>🛡️ Modo Escudo</option>
            </select>

            <!-- Channel filter -->
            <select class="form-select audit-channel-select" style="padding: 6px 8px; font-size: 11.5px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: #fff; border-radius: 4px;">
              <option value="ALL" ${this.filterChannel === 'ALL' ? 'selected' : ''}>Todos los Canales</option>
              ${channels.map(c => `
                <option value="${c.name}" ${this.filterChannel.toLowerCase() === c.name.toLowerCase() ? 'selected' : ''}>#${c.name} (${c.platform.toUpperCase()})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Live Sync Header & Action Count -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-dim);">
          <span>Mostrando <strong>${filtered.length}</strong> de ${allLogs.length} acciones registradas</span>
          <button class="refresh-real-logs-btn" style="background: none; border: none; color: #00d2d3; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Sincronizar historial con Twitch/Kick">
            <span>🔄 Sincronizar Logs API</span>
          </button>
        </div>

        <!-- Real Mod Logs List -->
        <div class="audit-logs-list" style="display: flex; flex-direction: column; gap: 8px;">
          ${filtered.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 45px 15px; font-size: 12.5px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px dashed var(--border-subtle);">
              <div style="font-size: 28px; margin-bottom: 8px;">🛡️</div>
              <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Sin acciones registradas aún</div>
              <div style="font-size: 11px; max-width: 320px; margin: 0 auto; color: var(--text-dim);">Las acciones de moderación (timeouts, baneos, mensajes borrados y cambios de modo) realizadas por moderadores de Twitch y Kick se registrarán aquí en tiempo real.</div>
            </div>
          ` : ''}

          ${filtered.map(log => {
            let badgeBg = 'rgba(255, 170, 0, 0.15)';
            let badgeColor = '#ffa502';
            let iconText = '⏱️ TIMEOUT';
            
            if (log.action === 'BAN') {
              badgeBg = 'rgba(255, 71, 87, 0.15)';
              badgeColor = '#ff4757';
              iconText = '🔨 BAN';
            } else if (log.action === 'UNBAN') {
              badgeBg = 'rgba(46, 213, 115, 0.15)';
              badgeColor = '#2ed573';
              iconText = '✓ DESBANEO';
            } else if (log.action === 'DELETE') {
              badgeBg = 'rgba(112, 161, 255, 0.15)';
              badgeColor = '#70a1ff';
              iconText = '🗑️ MENSAJE BORRADO';
            } else if (log.action === 'SHIELD') {
              badgeBg = 'rgba(255, 71, 87, 0.2)';
              badgeColor = '#ff4757';
              iconText = '🛡️ ESCUDO';
            } else if (log.action === 'MODE_CHANGE') {
              badgeBg = 'rgba(0, 210, 211, 0.15)';
              badgeColor = '#00d2d3';
              iconText = '⚙️ MODO SALA';
            }

            const isTwitch = log.platform === 'twitch';
            const timeDate = new Date(log.timestamp);
            const timeStr = !isNaN(timeDate) ? timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            const relativeTime = this._getRelativeTime(timeDate);

            return `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; font-size: 12px; transition: background 0.2s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px;">${iconText}</span>
                    <span class="channel-tag ${isTwitch ? 'badge-twitch' : 'badge-kick'}" style="font-size: 10.5px; font-weight: 700;">#${this._escapeHtml(log.channel)}</span>
                  </div>
                  <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono, monospace);" title="${log.timestamp}">${timeStr} <small style="opacity:0.7;">(${relativeTime})</small></span>
                </div>

                <div style="color: #fff; margin-top: 2px; line-height: 1.4;">
                  ${log.targetUser ? `<span style="font-weight: 700; color: #fff;">@${this._escapeHtml(log.targetUser)}</span>: ` : ''}
                  <span style="color: var(--text-muted);">${this._escapeHtml(log.details || 'Acción de moderación')}</span>
                </div>

                <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 4px;">
                  <span>Moderador: <strong style="color: ${isTwitch ? '#bf94ff' : '#53fc18'};">${this._escapeHtml(log.mod || 'Moderador')}</strong></span>
                  <span style="font-size: 9.5px; text-transform: uppercase; opacity: 0.7;">${log.platform.toUpperCase()}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="drawer-footer" style="padding: 12px 18px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
        <button class="btn btn-secondary clear-audit-btn" style="color: var(--danger-red); font-size: 11.5px; padding: 6px 12px;">Vaciar Historial</button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary export-csv-btn" style="font-size: 11.5px; padding: 6px 12px;">Exportar CSV</button>
          <button class="btn btn-primary export-json-btn" style="font-size: 11.5px; padding: 6px 12px;">Exportar JSON</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

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

    // Channel select
    const channelSelect = this.container.querySelector('.audit-channel-select');
    channelSelect?.addEventListener('change', (e) => {
      this.filterChannel = e.target.value;
      this.render();
    });

    // Sync button
    this.container.querySelector('.refresh-real-logs-btn')?.addEventListener('click', async () => {
      if (this.options.onFetchRealLogs) {
        const btn = this.container.querySelector('.refresh-real-logs-btn');
        if (btn) btn.innerHTML = '<span>⏳ Sincronizando con API...</span>';
        await this.options.onFetchRealLogs();
        this.render();
      }
    });

    // Clear logs
    this.container.querySelector('.clear-audit-btn')?.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar todo el registro de auditoría de moderación?')) {
        storageService.clearAuditLogs();
        this.render();
      }
    });

    // Export CSV
    this.container.querySelector('.export-csv-btn')?.addEventListener('click', () => {
      this._exportCsv();
    });

    // Export JSON
    this.container.querySelector('.export-json-btn')?.addEventListener('click', () => {
      this._exportJson();
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

  _exportCsv() {
    const logs = storageService.getAuditLogs();
    const headers = ['ID', 'Timestamp', 'Platform', 'Channel', 'Action', 'TargetUser', 'Mod', 'Details'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.platform,
      l.channel,
      l.action,
      `"${(l.targetUser || '').replace(/"/g, '""')}"`,
      `"${(l.mod || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orbimod_mod_actions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  _exportJson() {
    const logs = storageService.getAuditLogs();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `orbimod_mod_actions_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

