/**
 * NEXUS MOD DECK — AUDIT LOG DRAWER
 * Comprehensive chronological activity feed with filtering and CSV/JSON export
 */

import { storageService } from '../services/storageService.js';

export class AuditLogDrawer {
  constructor(containerElement) {
    this.container = containerElement;
    this.filterAction = 'ALL';
    this.searchQuery = '';
  }

  open() {
    this.render();
    this.container.classList.add('open');
    document.getElementById('drawer-backdrop').classList.add('active');
  }

  close() {
    this.container.classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('active');
  }

  render() {
    const allLogs = storageService.getAuditLogs();
    const filtered = allLogs.filter(log => {
      if (this.filterAction !== 'ALL' && log.action !== this.filterAction) return false;
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
      <div class="drawer-header">
        <div class="drawer-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Registro de Auditoría (Audit Log)</span>
        </div>
        <button class="icon-btn-subtle close-drawer-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="drawer-body">
        <!-- Search & Filter Controls -->
        <div style="display: flex; flex-direction: column; gap: 8px; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <input type="text" class="form-input audit-search-input" placeholder="Buscar por usuario, moderador, canal..." value="${this._escapeHtml(this.searchQuery)}">
          <div style="display: flex; gap: 6px;">
            <select class="form-select audit-filter-select" style="padding: 6px 10px; font-size: 12px;">
              <option value="ALL" ${this.filterAction === 'ALL' ? 'selected' : ''}>Todas las Acciones</option>
              <option value="TIMEOUT" ${this.filterAction === 'TIMEOUT' ? 'selected' : ''}>⏱️ Timeouts</option>
              <option value="BAN" ${this.filterAction === 'BAN' ? 'selected' : ''}>🔨 Baneos</option>
              <option value="UNBAN" ${this.filterAction === 'UNBAN' ? 'selected' : ''}>✓ Desbaneos</option>
              <option value="DELETE" ${this.filterAction === 'DELETE' ? 'selected' : ''}>🗑️ Mensajes Borrados</option>
              <option value="MODE_CHANGE" ${this.filterAction === 'MODE_CHANGE' ? 'selected' : ''}>⚙️ Modos de Sala</option>
              <option value="SHIELD" ${this.filterAction === 'SHIELD' ? 'selected' : ''}>🛡️ Escudo de Emergencia</option>
            </select>
          </div>
        </div>

        <!-- Logs Count Summary -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-dim);">
          <span>Mostrando ${filtered.length} de ${allLogs.length} acciones</span>
          <span class="mono">Historial en tiempo real</span>
        </div>

        <!-- Logs Stream List -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${filtered.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 40px 0; font-size: 12px;">
              No se encontraron registros de moderación con los filtros actuales.
            </div>
          ` : ''}

          ${filtered.map(log => {
            let badgeClass = 'badge-warning';
            let iconText = '⏱️ TIMEOUT';
            if (log.action === 'BAN') { badgeClass = 'badge-danger'; iconText = '🔨 BAN'; }
            else if (log.action === 'UNBAN') { badgeClass = 'badge-success'; iconText = '✓ UNBAN'; }
            else if (log.action === 'DELETE') { badgeClass = 'badge-secondary'; iconText = '🗑️ BORRADO'; }
            else if (log.action === 'SHIELD') { badgeClass = 'badge-danger'; iconText = '🛡️ ESCUDO'; }
            else if (log.action === 'MODE_CHANGE') { badgeClass = 'badge-warning'; iconText = '⚙️ MODO'; }

            const isTwitch = log.platform === 'twitch';

            return `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 12px; display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="${badgeClass}" style="padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">${iconText}</span>
                    <span class="channel-tag ${isTwitch ? 'badge-twitch' : 'badge-kick'}">#${log.channel}</span>
                  </div>
                  <span class="mono" style="font-size: 10px; color: var(--text-dim);">${new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                </div>
                <div style="color: #fff; margin-top: 2px;">
                  ${log.targetUser ? `<strong style="color:var(--text-main);">@${this._escapeHtml(log.targetUser)}</strong> — ` : ''}
                  <span style="color: var(--text-muted);">${this._escapeHtml(log.details || 'Acción completada')}</span>
                </div>
                <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">
                  Mod: <strong style="color: var(--text-muted);">${this._escapeHtml(log.mod || 'Sistema')}</strong> • ${new Date(log.timestamp).toLocaleDateString()}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="drawer-footer" style="justify-content: space-between;">
        <button class="btn btn-secondary clear-audit-btn" style="color: var(--danger-red);">Borrar Historial</button>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary export-csv-btn">Exportar CSV</button>
          <button class="btn btn-primary export-json-btn">Exportar JSON</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

    // Search
    const searchInput = this.container.querySelector('.audit-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    // Filter
    const select = this.container.querySelector('.audit-filter-select');
    select?.addEventListener('change', (e) => {
      this.filterAction = e.target.value;
      this.render();
    });

    // Clear
    this.container.querySelector('.clear-audit-btn')?.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar todo el registro de auditoría?')) {
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
    link.setAttribute('download', `nexus_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  _exportJson() {
    const logs = storageService.getAuditLogs();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `nexus_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
