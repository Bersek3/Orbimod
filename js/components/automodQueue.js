/**
 * NEXUS MOD DECK — AUTOMOD QUEUE DRAWER & FILTER SETTINGS
 * Held messages review station with 1-click mod decisions
 */

import { automodService } from '../services/automodService.js';
import { renderBadgesHTML } from '../data/defaultBadges.js';

export class AutoModQueueDrawer {
  constructor(containerElement, onAction) {
    this.container = containerElement;
    this.onAction = onAction; // { onApprove, onReject, onTimeout, onBan, onOpenSettings }
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
    const queue = automodService.getQueue();
    const pendingCount = automodService.getPendingCount();

    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Cola de Revisión AutoMod</span>
          <span class="pill-count ${pendingCount > 0 ? '' : 'green'}" style="position: static;">${pendingCount}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="icon-btn-subtle config-automod-btn" title="Configurar Reglas y Filtros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <button class="icon-btn-subtle close-drawer-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="drawer-body">
        ${queue.length === 0 ? `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-dim); text-align: center; gap: 12px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; opacity: 0.5;"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">Cola Limpia</div>
              <div style="font-size: 12px; margin-top: 4px;">No hay mensajes sospechosos o retenidos en este momento.</div>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${queue.map(item => `
            <div class="flagged-item-card" data-item-id="${item.id}" style="background: var(--bg-tertiary); border: 1px solid ${item.status === 'pending' ? 'rgba(255, 51, 102, 0.4)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px; opacity: ${item.status === 'pending' ? '1' : '0.6'};">
              <!-- Item Header -->
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="channel-tag ${item.platform === 'twitch' ? 'badge-twitch' : 'badge-kick'}">#${item.channel}</span>
                  <span class="msg-badges">${renderBadgesHTML(item.platform, item.badges)}</span>
                  <span style="font-weight: 700; color: ${item.color || '#fff'}; font-size: 12.5px;">${item.displayName || item.username}</span>
                </div>
                <span class="mono" style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>

              <!-- Item Reason Badge -->
              <div style="background: rgba(255, 51, 102, 0.12); border-left: 3px solid var(--danger-red); padding: 4px 8px; border-radius: 2px; font-size: 11.5px; color: #fca5a5;">
                <strong>⚠️ Motivo:</strong> ${this._escapeHtml(item.reason)}
              </div>

              <!-- Message Body -->
              <div style="background: rgba(0,0,0,0.35); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 12.5px; color: #fff; font-family: var(--font-mono); word-break: break-all;">
                "${this._escapeHtml(item.text)}"
              </div>

              <!-- Actions if pending -->
              ${item.status === 'pending' ? `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px;">
                  <button class="btn btn-secondary action-approve-btn" style="padding: 5px 2px; font-size: 11px; color: var(--success-green);">
                    ✓ Aprobar
                  </button>
                  <button class="btn btn-secondary action-reject-btn" style="padding: 5px 2px; font-size: 11px; color: var(--text-muted);">
                    ✕ Borrar
                  </button>
                  <button class="btn btn-secondary action-timeout-btn" style="padding: 5px 2px; font-size: 11px; color: var(--warning-amber);">
                    ⏱️ 10m
                  </button>
                  <button class="btn btn-shield action-ban-btn" style="padding: 5px 2px; font-size: 11px;">
                    🔨 Ban
                  </button>
                </div>
              ` : `
                <div style="font-size: 11px; color: var(--text-dim); text-align: right; font-style: italic;">
                  Decisión: <strong style="text-transform: uppercase;">${item.status}</strong>
                </div>
              `}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn btn-secondary clear-resolved-btn">Limpiar Resueltos</button>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

    this.container.querySelector('.config-automod-btn')?.addEventListener('click', () => {
      if (this.onAction && this.onAction.onOpenSettings) {
        this.onAction.onOpenSettings();
      }
    });

    this.container.querySelector('.clear-resolved-btn')?.addEventListener('click', () => {
      automodService.clearResolved();
      this.render();
    });

    // Item Action Buttons
    this.container.querySelectorAll('.flagged-item-card').forEach(card => {
      const itemId = card.dataset.itemId;
      const item = automodService.getQueue().find(i => i.id === itemId);
      if (!item || item.status !== 'pending') return;

      card.querySelector('.action-approve-btn')?.addEventListener('click', () => {
        automodService.resolveItem(itemId, 'approved');
        if (this.onAction && this.onAction.onApprove) {
          this.onAction.onApprove(item);
        }
        this.render();
      });

      card.querySelector('.action-reject-btn')?.addEventListener('click', () => {
        automodService.resolveItem(itemId, 'rejected');
        if (this.onAction && this.onAction.onReject) {
          this.onAction.onReject(item);
        }
        this.render();
      });

      card.querySelector('.action-timeout-btn')?.addEventListener('click', () => {
        automodService.resolveItem(itemId, 'sanctioned');
        if (this.onAction && this.onAction.onTimeout) {
          this.onAction.onTimeout(item, 600);
        }
        this.render();
      });

      card.querySelector('.action-ban-btn')?.addEventListener('click', () => {
        automodService.resolveItem(itemId, 'sanctioned');
        if (this.onAction && this.onAction.onBan) {
          this.onAction.onBan(item);
        }
        this.render();
      });
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
