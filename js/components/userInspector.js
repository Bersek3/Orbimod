/**
 * NEXUS MOD DECK — USER INSPECTOR & MOD NOTES DRAWER
 * Comprehensive profile inspection, session history, persistent mod notes, sanctions
 */

import { renderBadgesHTML } from '../data/defaultBadges.js';
import { storageService } from '../services/storageService.js';

export class UserInspectorDrawer {
  constructor(containerElement, onAction) {
    this.container = containerElement;
    this.onAction = onAction; // { onTimeout, onBan, onUnban, onAddNote }
    this.currentUser = null;
    this.currentChannel = null;
  }

  open(userObj, channelObj, sessionMessages = []) {
    this.currentUser = userObj;
    this.currentChannel = channelObj;

    const userKey = `${userObj.username.toLowerCase()}@${channelObj.platform}`;
    const notes = storageService.getUserNotes(userKey);
    const history = storageService.getUserHistory(userKey);
    const userSessionMsgs = sessionMessages.filter(m => m.username.toLowerCase() === userObj.username.toLowerCase());

    const isTwitch = channelObj.platform === 'twitch';
    const tagClass = isTwitch ? 'badge-twitch' : 'badge-kick';
    const badgesHtml = renderBadgesHTML(channelObj.platform, userObj.badges);

    this.container.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Inspector de Usuario</span>
        </div>
        <button class="icon-btn-subtle close-drawer-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="drawer-body">
        <!-- User Profile Card -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; gap: 12px; align-items: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${isTwitch ? 'var(--twitch-purple)' : 'var(--kick-green)'} 0%, #1e293b 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff;">
            ${userObj.username.charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 15px; font-weight: 700; color: #fff;">${userObj.displayName || userObj.username}</span>
              <span class="channel-tag ${tagClass}">${channelObj.platform.toUpperCase()}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
              @${userObj.username} • Canal: #${channelObj.name}
            </div>
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 4px;">
              ${badgesHtml || '<span style="font-size:10px; color:var(--text-dim);">Sin medallas especiales</span>'}
            </div>
          </div>
        </div>

        <!-- Quick Action Panel -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="form-label" style="font-size: 11.5px;">Acciones de Moderación Rápida</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            <button class="btn btn-secondary quick-timeout-btn" data-time="1" style="font-size: 11px; padding: 6px 4px;">1s Purge</button>
            <button class="btn btn-secondary quick-timeout-btn" data-time="60" style="font-size: 11px; padding: 6px 4px;">1 Min</button>
            <button class="btn btn-secondary quick-timeout-btn" data-time="600" style="font-size: 11px; padding: 6px 4px;">10 Min</button>
            <button class="btn btn-secondary quick-timeout-btn" data-time="86400" style="font-size: 11px; padding: 6px 4px;">24 Horas</button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
            <button class="btn btn-shield direct-ban-btn" style="width: 100%;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              <span>Banear Usuario</span>
            </button>
            <button class="btn btn-secondary direct-unban-btn" style="width: 100%;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              <span>Desbanear / Perdón</span>
            </button>
          </div>
        </div>

        <!-- Mod Notes Section -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <div class="form-label" style="font-size: 11.5px;">
            <span>📝 Notas Internas del Equipo Mod</span>
            <span class="mono" style="font-size: 10px; color: var(--text-dim);">${notes.length} notas</span>
          </div>

          <div style="display: flex; gap: 6px;">
            <input type="text" class="form-input add-note-input" placeholder="Escribir nota sobre este usuario...">
            <button class="btn btn-primary add-note-btn" style="padding: 6px 12px;">Guardar</button>
          </div>

          <div class="mod-notes-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
            ${notes.length === 0 ? '<div style="font-size: 11.5px; color: var(--text-dim); font-style: italic; padding: 6px 0;">No hay notas registradas para este usuario.</div>' : ''}
            ${notes.map(n => `
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 7px 10px; font-size: 12px;">
                <div style="color: #fff;">${this._escapeHtml(n.text)}</div>
                <div style="font-size: 10px; color: var(--text-dim); margin-top: 3px; display: flex; justify-content: space-between;">
                  <span>Por: ${n.author}</span>
                  <span class="mono">${new Date(n.timestamp).toLocaleDateString()} ${new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Session Message History -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <div class="form-label" style="font-size: 11.5px;">
            <span>💬 Historial en Sesión Actual</span>
            <span class="mono" style="font-size: 10px; color: var(--text-dim);">${userSessionMsgs.length} mensajes</span>
          </div>

          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            ${userSessionMsgs.length === 0 ? '<div style="font-size: 11.5px; color: var(--text-dim); font-style: italic;">No hay más mensajes en esta sesión.</div>' : ''}
            ${userSessionMsgs.map(m => `
              <div style="font-size: 11.5px; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 3px;">
                <span class="mono" style="color: var(--text-dim); font-size: 10px;">${new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>:
                <span style="color: #e2e8f0;">${this._escapeHtml(m.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sanction History -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <div class="form-label" style="font-size: 11.5px;">
            <span>⚖️ Historial de Sanciones Previas</span>
            <span class="mono" style="font-size: 10px; color: var(--text-dim);">${history.length} sanciones</span>
          </div>

          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            ${history.length === 0 ? '<div style="font-size: 11.5px; color: var(--text-dim); font-style: italic;">Historial limpio sin sanciones previas.</div>' : ''}
            ${history.map(h => `
              <div style="font-size: 11px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding: 3px 0;">
                <span class="badge-${h.type === 'ban' ? 'danger' : 'warning'}" style="padding: 1px 4px; border-radius: 3px; font-size: 9.5px; font-weight: 700;">${h.type.toUpperCase()} ${h.duration ? '(' + h.duration + 's)' : ''}</span>
                <span style="color: var(--text-muted); font-size: 10.5px;">${this._escapeHtml(h.reason)}</span>
                <span class="mono" style="color: var(--text-dim); font-size: 10px;">${new Date(h.timestamp).toLocaleDateString()}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this._bindEvents(userKey);
    this.container.classList.add('open');
    document.getElementById('drawer-backdrop').classList.add('active');
  }

  close() {
    this.container.classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('active');
  }

  _bindEvents(userKey) {
    // Close button
    this.container.querySelector('.close-drawer-btn').addEventListener('click', () => this.close());

    // Quick Timeouts
    this.container.querySelectorAll('.quick-timeout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const seconds = parseInt(btn.dataset.time);
        if (this.onAction && this.onAction.onTimeout) {
          this.onAction.onTimeout(this.currentChannel, this.currentUser, seconds);
        }
        this.open(this.currentUser, this.currentChannel); // refresh
      });
    });

    // Ban
    this.container.querySelector('.direct-ban-btn').addEventListener('click', () => {
      if (confirm(`¿Banear a @${this.currentUser.username} permanentemente?`)) {
        if (this.onAction && this.onAction.onBan) {
          this.onAction.onBan(this.currentChannel, this.currentUser);
        }
        this.open(this.currentUser, this.currentChannel);
      }
    });

    // Unban
    this.container.querySelector('.direct-unban-btn').addEventListener('click', () => {
      if (this.onAction && this.onAction.onUnban) {
        this.onAction.onUnban(this.currentChannel, this.currentUser);
      }
      this.open(this.currentUser, this.currentChannel);
    });

    // Add Mod Note
    const noteInput = this.container.querySelector('.add-note-input');
    const noteBtn = this.container.querySelector('.add-note-btn');

    const handleSaveNote = () => {
      const text = noteInput.value.trim();
      if (!text) return;
      storageService.addUserNote(userKey, { text: text, author: 'Tú (Mod)' });
      this.open(this.currentUser, this.currentChannel);
    };

    noteBtn.addEventListener('click', handleSaveNote);
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSaveNote();
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
