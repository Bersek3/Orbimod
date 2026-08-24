/**
 * NEXUS MOD DECK — EVENT & RAID RADAR DRAWER
 * Live feed for incoming raids, subs, gifts + 1-Click Raid Shield
 */

import { soundService } from '../services/soundService.js';

export class EventRadarDrawer {
  constructor(containerElement, onAction) {
    this.container = containerElement;
    this.onAction = onAction; // { onToggleShield, onSimulateRaid }
    this.events = [];
    this.shieldActive = false;
  }

  addEvent(eventObj) {
    this.events.unshift(eventObj);
    if (this.events.length > 50) this.events.pop();

    if (eventObj.type === 'RAID') {
      soundService.playRaidAlert();
    }

    if (this.container.classList.contains('open')) {
      this.render();
    }
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
    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Radar de Eventos & Raids</span>
        </div>
        <button class="icon-btn-subtle close-drawer-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="drawer-body">
        <!-- Emergency Raid Shield Box -->
        <div style="background: linear-gradient(135deg, rgba(255, 51, 102, 0.15) 0%, rgba(20, 10, 15, 0.8) 100%); border: 1px solid rgba(255, 51, 102, 0.4); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🛡️</span>
              <div>
                <div style="font-weight: 700; color: #fff; font-size: 13.5px;">Modo Escudo / Raid Shield</div>
                <div style="font-size: 11px; color: var(--text-dim);">Protección contra raids de odio y bots</div>
              </div>
            </div>
            <button class="btn btn-shield raid-shield-toggle-btn ${this.shieldActive ? 'active' : ''}">
              ${this.shieldActive ? 'ACTIVO' : 'ACTIVAR'}
            </button>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
            Al activar: Bloquea enlaces estrictamente, activa modo seguidores (10m) y ralentiza el chat en todos los canales.
          </div>
        </div>

        <!-- Simulator test actions -->
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary trigger-test-raid-btn" style="flex: 1; font-size: 11.5px;">
            ⚡ Simular Raid Entrante
          </button>
        </div>

        <!-- Events Stream -->
        <div class="form-label" style="font-size: 11.5px; margin-top: 6px;">
          <span>📡 Flujo de Eventos en Vivo</span>
          <span class="mono" style="font-size: 10px; color: var(--text-dim);">${this.events.length} eventos</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${this.events.length === 0 ? `
            <div style="text-align: center; color: var(--text-dim); padding: 40px 0; font-size: 12px;">
              Esperando eventos de raid, suscripciones y donaciones...
            </div>
          ` : ''}

          ${this.events.map(ev => {
            const isRaid = ev.type === 'RAID';
            const isTwitch = ev.platform === 'twitch';

            return `
              <div style="background: var(--bg-tertiary); border: 1px solid ${isRaid ? 'var(--twitch-purple)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="${isRaid ? 'badge-twitch' : 'badge-kick'}" style="padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 700;">
                      ${isRaid ? '🚀 RAID' : '⭐ SUBSCRIPCIÓN'}
                    </span>
                    <span class="channel-tag ${isTwitch ? 'badge-twitch' : 'badge-kick'}">#${ev.channel}</span>
                  </div>
                  <span class="mono" style="font-size: 10px; color: var(--text-dim);">${new Date(ev.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div style="color: #fff; font-size: 12.5px; margin-top: 3px;">
                  ${isRaid ? `
                    <strong style="color: var(--twitch-purple-light);">@${this._escapeHtml(ev.raider)}</strong> ha entrado con una raid de <strong style="color: var(--accent-cyan);">${ev.viewers.toLocaleString()} espectadores</strong>!
                  ` : `
                    <strong style="color: var(--kick-green);">${this._escapeHtml(ev.user)}</strong> se ha suscrito con <strong>${this._escapeHtml(ev.tier)}</strong>!
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

    // Toggle Raid Shield
    const shieldBtn = this.container.querySelector('.raid-shield-toggle-btn');
    shieldBtn?.addEventListener('click', () => {
      this.shieldActive = !this.shieldActive;
      if (this.onAction && this.onAction.onToggleShield) {
        this.onAction.onToggleShield(this.shieldActive);
      }
      this.render();
    });

    // Test Raid
    this.container.querySelector('.trigger-test-raid-btn')?.addEventListener('click', () => {
      if (this.onAction && this.onAction.onSimulateRaid) {
        this.onAction.onSimulateRaid();
      }
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
