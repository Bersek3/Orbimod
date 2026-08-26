/**
 * NEXUS MOD DECK — MODAL DIALOGS & API ACCOUNT LINKING
 * Official Twitch Helix OAuth, Auto-Detection of Moderated Channels, Kick API
 */

import { storageService } from '../services/storageService.js';
import { apiService } from '../services/apiService.js';
import { supabaseAuthService } from '../services/supabaseAuthService.js';

// ==========================================
// 1. MANAGE CHANNELS MODAL (DIRECT DECK CONTROL)
// ==========================================
export class ManageChannelsModal {
  constructor(modalElement, { getChannels, onAddChannel, onRemoveChannel, onScanChannels, onClearChannels, onRefreshLive }) {
    this.modal = modalElement;
    this.getChannels = getChannels;
    this.onAddChannel = onAddChannel;
    this.onRemoveChannel = onRemoveChannel;
    this.onScanChannels = onScanChannels;
    this.onClearChannels = onClearChannels;
    this.onRefreshLive = onRefreshLive;
    this.selectedPlatform = 'twitch';
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const channels = this.getChannels() || [];
    const liveChannels = channels.filter(c => Boolean(c.isLive));
    const offlineChannels = channels.filter(c => !Boolean(c.isLive));

    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 640px;">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Gestión de Canales (${channels.length})</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto;">
          <!-- Top Action Bar: Sync & Refresh -->
          <div style="background: rgba(145, 70, 255, 0.08); border: 1px solid rgba(145, 70, 255, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-weight: 700; font-size: 12.5px; color: #fff;">Sincronizar Moderaciones</div>
              <div style="font-size: 11px; color: var(--text-dim);">Escanear automáticamente canales de Twitch</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button id="btn-modal-refresh-live" class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px;" title="Verificar quién está transmitiendo ahora">
                <span>🔄 Comprobar En Vivo</span>
              </button>
              <button id="btn-modal-scan-twitch" class="btn btn-primary" style="font-size: 11px; padding: 5px 12px; white-space: nowrap;">
                <span>⚡ Escanear Twitch</span>
              </button>
            </div>
          </div>

          <!-- Add New Channel Section -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px;">
            <div style="font-weight: 700; font-size: 12px; color: #fff; margin-bottom: 8px;">Añadir Canal Manualmente</div>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
              <button class="btn btn-secondary platform-toggle-btn ${this.selectedPlatform === 'twitch' ? 'active' : ''}" data-plat="twitch" style="font-size: 11px; padding: 4px 10px;">🟣 Twitch</button>
              <button class="btn btn-secondary platform-toggle-btn ${this.selectedPlatform === 'kick' ? 'active' : ''}" data-plat="kick" style="font-size: 11px; padding: 4px 10px;">🟢 Kick</button>
            </div>
            <div style="display: flex; gap: 6px;">
              <input type="text" id="modal-add-channel-input" class="form-input" placeholder="Nombre del streamer (ej. ibai, westcol...)" style="flex: 1; font-size: 12.5px;">
              <button id="btn-modal-submit-add" class="btn ${this.selectedPlatform === 'twitch' ? 'btn-primary' : 'btn-kick'}" style="font-size: 12px; padding: 6px 14px;">+ Añadir</button>
            </div>
          </div>

          <!-- SECTION 1: LIVE CHANNELS -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="metric-dot pulse" style="background: var(--danger-red); width: 8px; height: 8px;"></span>
                <span style="font-weight: 800; font-size: 12px; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">Transmitiendo En Vivo (${liveChannels.length})</span>
              </div>
              ${channels.length > 0 ? `<button id="btn-modal-clear-all" style="background: transparent; border: none; color: var(--danger-red); font-size: 11px; cursor: pointer;">🗑️ Quitar todos</button>` : ''}
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${liveChannels.length === 0 ? `
                <div style="text-align: center; padding: 14px; color: var(--text-dim); font-size: 11.5px; background: rgba(0,0,0,0.2); border-radius: var(--radius-xs);">
                  Ningún canal en tu lista está transmitiendo en vivo actualmente.
                </div>
              ` : liveChannels.map(ch => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(18, 24, 38, 0.65); border: 1px solid rgba(255, 51, 102, 0.25); border-left: 3px solid var(--danger-red); border-radius: var(--radius-xs); padding: 8px 12px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge-${ch.platform}" style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 3px;">${ch.platform === 'twitch' ? 'TW' : 'KC'}</span>
                    <div>
                      <div style="font-weight: 700; font-size: 13px; color: #fff;">#${ch.name}</div>
                      <div style="font-size: 10.5px; color: var(--danger-red); font-weight: 600;">🔴 EN VIVO ${ch.viewers ? `(${ch.viewers.toLocaleString()} viewers)` : ''}</div>
                    </div>
                  </div>
                  <button class="btn-remove-deck-channel" data-id="${ch.id}" style="background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 4px;" title="Quitar canal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- SECTION 2: OFFLINE CHANNELS -->
          ${offlineChannels.length > 0 ? `
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span class="metric-dot" style="background: var(--text-dim); width: 8px; height: 8px;"></span>
                <span style="font-weight: 700; font-size: 11.5px; color: var(--text-muted); text-transform: uppercase;">Fuera de Línea (${offlineChannels.length})</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 5px;">
                ${offlineChannels.map(ch => `
                  <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-subtle); opacity: 0.7; border-radius: var(--radius-xs); padding: 6px 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="badge-${ch.platform}" style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 3px;">${ch.platform === 'twitch' ? 'TW' : 'KC'}</span>
                      <span style="font-weight: 600; font-size: 12.5px; color: var(--text-main);">#${ch.name} <span style="font-size: 10px; color: var(--text-dim);">(Offline)</span></span>
                    </div>
                    <button class="btn-remove-deck-channel" data-id="${ch.id}" style="background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 4px;" title="Quitar canal">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn" style="width: 100%;">Listo</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    this.modal.querySelectorAll('.platform-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPlatform = btn.dataset.plat;
        this.render();
      });
    });

    // Refresh live status
    this.modal.querySelector('#btn-modal-refresh-live')?.addEventListener('click', async () => {
      const btn = this.modal.querySelector('#btn-modal-refresh-live');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Comprobando...';
      }
      if (this.onRefreshLive) {
        await this.onRefreshLive();
      }
      this.render();
    });

    // Auto scan Twitch
    this.modal.querySelector('#btn-modal-scan-twitch')?.addEventListener('click', async () => {
      const scanBtn = this.modal.querySelector('#btn-modal-scan-twitch');
      if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = 'Buscando...';
      }
      if (this.onScanChannels) {
        await this.onScanChannels();
      }
      this.render();
    });

    // Clear all
    this.modal.querySelector('#btn-modal-clear-all')?.addEventListener('click', () => {
      if (confirm('¿Deseas quitar todos los canales del Deck?')) {
        if (this.onClearChannels) this.onClearChannels();
        this.render();
      }
    });

    // Add manual channel
    const addInput = this.modal.querySelector('#modal-add-channel-input');
    const submitAdd = this.modal.querySelector('#btn-modal-submit-add');
    const handleAdd = async () => {
      const name = addInput?.value.trim().toLowerCase().replace(/[@#]/g, '');
      if (!name) return;

      if (submitAdd) {
        submitAdd.disabled = true;
        submitAdd.textContent = 'Verificando en vivo...';
      }

      let res;
      if (this.selectedPlatform === 'twitch') {
        res = await apiService.fetchTwitchChannel(name);
      } else {
        res = await apiService.fetchKickChannel(name);

        if (res.success) {
          // Check if current user is moderator in this Kick channel
          const profiles = storageService.getProfiles?.() || {};
          const loggedKickUser = (profiles.kick?.username || '').toLowerCase();

          if (loggedKickUser) {
            submitAdd.textContent = 'Verificando rol de Moderador...';
            const modCheck = await apiService.checkKickModStatus(name, loggedKickUser);

            if (modCheck.isMod) {
              res.channel.isModerator = true;
              res.channel.role = modCheck.isOwner ? 'owner' : 'mod';
            } else {
              res.channel.isModerator = false;
              res.channel.role = 'viewer';

              const proceed = confirm(
                `⚠️ Aviso de Permisos en Kick:\n\n` +
                `Tu cuenta (@${loggedKickUser}) NO figura como Moderador ni Propietario en el canal #${name} de Kick.\n\n` +
                `¿Deseas añadir el canal de todos modos para visualizar el chat y stream en tiempo real?`
              );

              if (!proceed) {
                if (submitAdd) {
                  submitAdd.disabled = false;
                  submitAdd.textContent = '+ Añadir';
                }
                return;
              }
            }
          } else {
            const proceed = confirm(
              `ℹ️ Cuenta de Kick no conectada:\n\n` +
              `No has vinculado tu cuenta de Kick en OrbiMod. El canal #${name} se añadirá en modo Espectador (Viewer).\n\n` +
              `¿Deseas continuar?`
            );
            if (!proceed) {
              if (submitAdd) {
                submitAdd.disabled = false;
                submitAdd.textContent = '+ Añadir';
              }
              return;
            }
            res.channel.isModerator = false;
            res.channel.role = 'viewer';
          }
        }
      }

      if (!res.success) {
        alert(res.error || `No se pudo encontrar el canal #${name} en ${this.selectedPlatform.toUpperCase()}`);
        if (submitAdd) {
          submitAdd.disabled = false;
          submitAdd.textContent = '+ Añadir';
        }
        return;
      }

      if (this.onAddChannel) {
        this.onAddChannel(res.channel);
      }
      this.render();
    };

    submitAdd?.addEventListener('click', handleAdd);
    addInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

    // Remove single channel
    this.modal.querySelectorAll('.btn-remove-deck-channel').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (this.onRemoveChannel) {
          this.onRemoveChannel(id);
        }
        this.render();
      });
    });
  }
}

// ==========================================
// 2. ADD CHANNEL MODAL (LEGACY FALLBACK)
// ==========================================
export class AddChannelModal {
  constructor(modalElement, onChannelAdd) {
    this.modal = modalElement;
    this.onChannelAdd = onChannelAdd;
    this.selectedPlatform = 'twitch';
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    this.modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>Añadir Canal a Moderar</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Platform Selector -->
          <div class="form-group">
            <label class="form-label">Plataforma de Streaming</label>
            <div class="radio-card-group">
              <div class="radio-card twitch ${this.selectedPlatform === 'twitch' ? 'selected' : ''}" data-platform="twitch">
                <div class="radio-card-icon twitch">TW</div>
                <div>
                  <div style="font-weight: 700; color: #fff;">Twitch</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Conexión Helix & IRC WebSocket</div>
                </div>
              </div>

              <div class="radio-card kick ${this.selectedPlatform === 'kick' ? 'selected' : ''}" data-platform="kick">
                <div class="radio-card-icon kick">KC</div>
                <div>
                  <div style="font-weight: 700; color: #fff;">Kick</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Conexión Pusher Cluster & API</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Channel Username -->
          <div class="form-group">
            <label class="form-label">Nombre del Canal o Streamer</label>
            <div style="display: flex; gap: 6px;">
              <input type="text" class="form-input channel-name-input ${this.selectedPlatform === 'kick' ? 'kick-focus' : ''}" placeholder="ej. ibai, westcol, auronplay...">
              <button class="btn btn-secondary check-channel-btn" style="padding: 6px 12px;">Verificar API</button>
            </div>
            <div class="channel-preview-box" style="display: none; margin-top: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; align-items: center; gap: 10px;">
              <!-- Live API Channel Preview -->
            </div>
            <div class="form-help">La API consultará automáticamente el estado en vivo, avatar y chatroom del canal.</div>
          </div>

          <!-- Stream Preview Option -->
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-main); cursor: pointer;">
              <input type="checkbox" class="enable-video-check" checked>
              <span>Activar reproductor de video en vivo (Live Player)</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Cancelar</button>
          <button class="btn ${this.selectedPlatform === 'twitch' ? 'btn-primary' : 'btn-kick'} submit-add-btn">
            <span>+ Añadir al Deck</span>
          </button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    this.modal.querySelectorAll('.radio-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedPlatform = card.dataset.platform;
        this.render();
      });
    });

    const input = this.modal.querySelector('.channel-name-input');
    const previewBox = this.modal.querySelector('.channel-preview-box');
    const checkBtn = this.modal.querySelector('.check-channel-btn');
    const videoCheck = this.modal.querySelector('.enable-video-check');
    let fetchedChannelData = null;

    // Check Channel via API
    checkBtn?.addEventListener('click', async () => {
      const name = input.value.trim().toLowerCase().replace('@', '');
      if (!name) return;

      checkBtn.textContent = 'Buscando...';
      checkBtn.disabled = true;

      if (this.selectedPlatform === 'kick') {
        const res = await apiService.fetchKickChannel(name);
        if (res.success) {
          fetchedChannelData = res.channel;
          previewBox.style.display = 'flex';
          previewBox.innerHTML = `
            <img src="${res.channel.avatar}" style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--kick-green);">
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #fff;">${res.channel.displayName}</div>
              <div style="font-size: 11px; color: var(--text-dim);">${res.channel.isLive ? '🔴 EN VIVO (' + res.channel.viewers.toLocaleString() + ' viewers)' : '⚪ Fuera de línea'}</div>
            </div>
            <span class="badge-success" style="padding: 2px 6px; border-radius: 3px; font-size: 10px;">VERIFICADO</span>
          `;
        } else {
          previewBox.style.display = 'flex';
          previewBox.innerHTML = `<span style="font-size: 12px; color: var(--danger-red);">${res.error}</span>`;
        }
      } else {
        // Twitch
        previewBox.style.display = 'flex';
        previewBox.innerHTML = `
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--twitch-purple); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">TW</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #fff;">#${name}</div>
            <div style="font-size: 11px; color: var(--text-dim);">Canal de Twitch listo para sincronizar</div>
          </div>
        `;
      }

      checkBtn.textContent = 'Verificar API';
      checkBtn.disabled = false;
    });

    // Submit Add
    const submitBtn = this.modal.querySelector('.submit-add-btn');
    const handleAdd = () => {
      const name = input.value.trim().toLowerCase().replace('@', '');
      if (!name) {
        alert('Por favor introduce un nombre de canal válido.');
        return;
      }

      let newChannel;
      if (fetchedChannelData && fetchedChannelData.name.toLowerCase() === name) {
        newChannel = { ...fetchedChannelData, videoEnabled: videoCheck.checked };
      } else {
        newChannel = {
          id: `ch-${this.selectedPlatform}-${name}`,
          name: name,
          platform: this.selectedPlatform,
          avatar: `https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop`,
          viewers: Math.floor(Math.random() * 15000) + 1200,
          isLive: true,
          videoEnabled: videoCheck.checked,
          slowMode: 0,
          subOnly: false,
          followOnly: false,
          emoteOnly: false
        };
      }

      if (this.onChannelAdd) {
        this.onChannelAdd(newChannel);
      }
      this.close();
    };

    submitBtn?.addEventListener('click', handleAdd);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }
}

// ==========================================
// 2. OFFICIAL API & ACCOUNT VINCULATION MODAL
// ==========================================
export class ConnectionHubModal {
  constructor(modalElement, onSave) {
    this.modal = modalElement;
    this.onSave = onSave;
    this.detectedModeratedChannels = [];
    this.activeTab = 'twitch';
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const creds = storageService.getAuthCreds();
    const profiles = storageService.getProfiles();
    const settings = storageService.getSettings();

    const twitchConnected = profiles.twitch && profiles.twitch.valid;
    const kickConnected = profiles.kick && profiles.kick.valid;

    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 680px;">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            <span>Vinculación de Cuentas (Twitch & Kick APIs)</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Connection Tabs -->
          <div class="tab-nav">
            <button class="tab-btn ${this.activeTab === 'twitch' ? 'active' : ''}" data-tab="twitch" style="display:flex; align-items:center; gap:6px;">
              <span class="metric-dot" style="background:${twitchConnected ? 'var(--success-green)' : 'var(--text-dim)'}"></span>
              <span>🟣 Cuenta de Twitch (Helix OAuth)</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'kick' ? 'active' : ''}" data-tab="kick" style="display:flex; align-items:center; gap:6px;">
              <span class="metric-dot" style="background:${kickConnected ? 'var(--success-green)' : 'var(--text-dim)'}"></span>
              <span>🟢 Cuenta de Kick (Pusher / API)</span>
            </button>
            <button class="tab-btn ${this.activeTab === 'sandbox' ? 'active' : ''}" data-tab="sandbox">
              <span>⚙️ Demo Sandbox</span>
            </button>
          </div>

          <!-- TAB 1: TWITCH HELIX OAUTH & AUTO-MODERATED CHANNELS -->
          <div id="tab-content-twitch" class="tab-content" style="${this.activeTab === 'twitch' ? 'display:block;' : 'display:none;'}">
            <!-- Connected User Profile Box if valid -->
            ${twitchConnected ? `
              <div style="background: linear-gradient(135deg, rgba(145,70,255,0.2) 0%, rgba(20,25,35,0.9) 100%); border: 1px solid var(--border-twitch); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${profiles.twitch.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop'}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--twitch-purple);">
                  <div>
                    <div style="font-size: 15px; font-weight: 700; color: #fff;">@${profiles.twitch.login} <span class="badge-success" style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px;">VINCULADO Y AUTORIZADO</span></div>
                    <div style="font-size: 11px; color: var(--text-dim);">User ID: ${profiles.twitch.userId} • Helix API & Chat IRC Activos</div>
                  </div>
                </div>
                <button class="btn btn-secondary disconnect-twitch-btn" style="font-size: 11px; color: var(--danger-red);">Desvincular</button>
              </div>
            ` : `
              <!-- Primary 1-Click Official Twitch Login Banner -->
              <div style="background: linear-gradient(135deg, rgba(145,70,255,0.18) 0%, rgba(30,20,50,0.85) 100%); border: 1px solid var(--border-twitch); border-radius: var(--radius-md); padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; box-shadow: 0 4px 20px var(--twitch-purple-subtle);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                  <div>
                    <div style="font-weight: 800; color: #fff; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                      <span>🟣 Iniciar Sesión con Twitch</span>
                      <span class="badge-success" style="font-size: 9.5px; padding: 1px 6px; border-radius: 3px;">OFICIAL (1-CLIC)</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
                      Conéctate de forma segura con tu cuenta de Twitch para autodetectar todos los canales que moderas.
                    </div>
                  </div>
                  <button class="btn btn-primary direct-oauth-login-btn" style="font-size: 13px; font-weight: 700; padding: 10px 18px; box-shadow: 0 0 15px var(--twitch-purple-glow);">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                    <span>Conectar mi Cuenta con Twitch</span>
                  </button>
                </div>
              </div>

              <!-- Secondary Advanced Options (Token Manual / Token Generator) -->
              <details style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px;">
                <summary style="font-size: 11.5px; color: var(--text-dim); cursor: pointer; font-weight: 600;">Opciones avanzadas (Token manual alternativo)</summary>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-size: 11px; color: var(--text-muted);">Si prefieres ingresar un token generado manualmente:</div>
                  <div style="display: flex; gap: 6px;">
                    <input type="password" class="form-input twitch-token-input" placeholder="Pega tu Access Token manual..." value="${this._escapeHtml(creds.twitchToken || '')}">
                    <button class="btn btn-secondary validate-twitch-btn" style="padding: 7px 14px; font-size: 11.5px;">
                      <span>Validar Token</span>
                    </button>
                  </div>
                  <div id="twitch-validation-feedback" style="display: none; font-size: 11.5px; padding: 6px 10px; border-radius: 4px;"></div>
                </div>
              </details>
            `}

            <!-- Auto-Detected Moderated Channels Section -->
            <div style="margin-top: 14px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 13px;">Canales donde eres Moderador (Auto-Detección API)</div>
                  <div style="font-size: 11px; color: var(--text-dim);">Consulta en vivo mediante <code class="mono">/helix/moderation/channels</code></div>
                </div>
                <button class="btn btn-secondary fetch-mod-channels-btn" ${!twitchConnected ? 'disabled' : ''} style="font-size: 11.5px;">
                  <span>⚡ Escanear Canales que Modero</span>
                </button>
              </div>

              <div id="moderated-channels-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;">
                <div style="font-size: 11.5px; color: var(--text-dim); font-style: italic; padding: 8px 0; text-align: center;">
                  ${twitchConnected ? 'Haz clic en "Escanear Canales que Modero" para cargar tu lista en vivo.' : 'Pega y valida tu token de Twitch arriba para importar tus canales automáticamente.'}
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: KICK API & PUSHER ACCOUNT -->
          <div id="tab-content-kick" class="tab-content" style="${this.activeTab === 'kick' ? 'display:block;' : 'display:none;'}">
            <!-- Connected User Profile Box if valid -->
            ${kickConnected ? `
              <div style="background: linear-gradient(135deg, rgba(83,252,24,0.15) 0%, rgba(20,25,35,0.9) 100%); border: 1px solid var(--border-kick); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${profiles.kick.avatar || 'https://via.placeholder.com/44'}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--kick-green);">
                  <div>
                    <div style="font-size: 15px; font-weight: 700; color: #fff;">@${profiles.kick.username} <span class="badge-kick" style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px;">KICK MOD</span></div>
                    <div style="font-size: 11px; color: var(--text-dim);">Pusher Cluster Conectado • API v2 Sincronizada</div>
                  </div>
                </div>
                <button class="btn btn-secondary disconnect-kick-btn" style="font-size: 11px; color: var(--danger-red);">Desvincular</button>
              </div>
            ` : ''}

            <!-- Kick Username / Channel Input -->
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-kick); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
              <div class="form-label">Tu Usuario o Canal en Kick</div>
              <div style="display: flex; gap: 6px;">
                <input type="text" class="form-input kick-focus kick-username-input" placeholder="ej. Westcol, MiUsuarioKick..." value="${this._escapeHtml(creds.kickUsername || '')}">
                <button class="btn btn-kick verify-kick-btn" style="padding: 7px 14px;">
                  <span>Verificar Cuenta Kick</span>
                </button>
              </div>
              <div class="form-help">Verifica tu cuenta y sincroniza tus salas de chat a través del cluster de WebSockets de Kick.</div>
              <div id="kick-validation-feedback" style="display: none; font-size: 11.5px; padding: 6px 10px; border-radius: 4px;"></div>
            </div>
          </div>

          <!-- TAB 3: SANDBOX DEMO -->
          <div id="tab-content-sandbox" class="tab-content" style="${this.activeTab === 'sandbox' ? 'display:block;' : 'display:none;'}">
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 700; color: #fff;">Modo Simulador Live (Demo Sandbox)</div>
                <div style="font-size: 11px; color: var(--text-dim);">Genera tráfico realista con bots, variedad de usuarios, spam y raids simulados.</div>
              </div>
              <input type="checkbox" class="demo-mode-switch" ${settings.demoMode ? 'checked' : ''} style="width: 20px; height: 20px;">
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Cerrar</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    // Tab Navigation
    this.modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    // Copy Redirect URI Button
    const copyUriBtn = this.modal.querySelector('.copy-redirect-uri-btn');
    copyUriBtn?.addEventListener('click', () => {
      const uri = apiService.getCurrentRedirectUri();
      navigator.clipboard.writeText(uri).then(() => {
        copyUriBtn.textContent = '✓ Copiado';
        setTimeout(() => { copyUriBtn.textContent = 'Copiar URI'; }, 2000);
      });
    });

    // Direct 1-Click OAuth Login Button
    const directLoginBtn = this.modal.querySelector('.direct-oauth-login-btn');
    directLoginBtn?.addEventListener('click', () => {
      const clientId = apiService.getTwitchClientId();
      const authUrl = apiService.getTwitchAuthUrl(clientId);
      window.location.href = authUrl;
    });

    const tokenInput = this.modal.querySelector('.twitch-token-input');
    const feedbackBox = this.modal.querySelector('#twitch-validation-feedback');
    const validateBtn = this.modal.querySelector('.validate-twitch-btn');

    // Validate Twitch Token
    validateBtn?.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (!token) return;

      validateBtn.textContent = 'Validando...';
      validateBtn.disabled = true;

      const result = await apiService.validateTwitchToken(token);
      feedbackBox.style.display = 'block';

      if (result.valid) {
        feedbackBox.style.background = 'rgba(0, 240, 144, 0.15)';
        feedbackBox.style.color = 'var(--success-green)';
        feedbackBox.innerHTML = `✅ <strong>Token Válido:</strong> Conectado como @${result.login} (ID: ${result.userId})`;

        // Fetch User Profile Image
        const userProfile = await apiService.fetchTwitchUserProfile(result.token, result.clientId);

        const profiles = storageService.getProfiles();
        profiles.twitch = {
          valid: true,
          login: result.login,
          userId: result.userId,
          clientId: result.clientId,
          token: result.token,
          scopes: result.scopes,
          avatar: userProfile ? userProfile.profile_image_url : ''
        };
        storageService.saveProfiles(profiles);

        const creds = storageService.getAuthCreds();
        creds.twitchToken = result.token;
        creds.twitchUsername = result.login;
        storageService.saveAuthCreds(creds);

        if (this.onSave) this.onSave({ twitch: profiles.twitch });
        setTimeout(() => this.render(), 1000);
      } else {
        feedbackBox.style.background = 'rgba(255, 51, 102, 0.15)';
        feedbackBox.style.color = 'var(--danger-red)';
        feedbackBox.innerHTML = `❌ ${result.error}`;
      }

      validateBtn.textContent = 'Validar Token';
      validateBtn.disabled = false;
    });

    // Scan Moderated Channels from Twitch Helix API
    const scanBtn = this.modal.querySelector('.fetch-mod-channels-btn');
    const channelsListEl = this.modal.querySelector('#moderated-channels-list');

    scanBtn?.addEventListener('click', async () => {
      const profiles = storageService.getProfiles();
      if (!profiles.twitch || !profiles.twitch.valid) return;

      scanBtn.textContent = 'Escaneando Helix...';
      scanBtn.disabled = true;

      const result = await apiService.fetchModeratedChannels(profiles.twitch.token, profiles.twitch.clientId, profiles.twitch.userId);

      if (result.success && result.channels.length > 0) {
        this.detectedModeratedChannels = result.channels;
        channelsListEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: var(--success-green); font-weight: 600;">Se encontraron ${result.channels.length} canales moderados:</span>
            <button class="btn btn-primary import-all-channels-btn" style="font-size: 11px; padding: 4px 10px;">
              ⚡ Importar Todos al Deck
            </button>
          </div>
          ${result.channels.map(ch => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 6px 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${ch.avatar || 'https://via.placeholder.com/24'}" style="width: 24px; height: 24px; border-radius: 50%;">
                <span style="font-weight: 700; color: #fff; font-size: 12.5px;">#${ch.name}</span>
                <span class="channel-tag badge-twitch">MOD</span>
              </div>
              <button class="btn btn-secondary import-single-channel-btn" data-chan-name="${ch.name}" style="font-size: 10.5px; padding: 3px 8px;">+ Añadir</button>
            </div>
          `).join('')}
        `;

        // Bind Import Buttons
        channelsListEl.querySelector('.import-all-channels-btn')?.addEventListener('click', () => {
          if (this.onSave) {
            this.onSave({ importChannels: this.detectedModeratedChannels });
          }
          this.close();
        });

        channelsListEl.querySelectorAll('.import-single-channel-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const name = btn.dataset.chanName;
            const chObj = this.detectedModeratedChannels.find(c => c.name === name);
            if (chObj && this.onSave) {
              this.onSave({ importSingle: chObj });
              btn.textContent = '✓ Añadido';
              btn.disabled = true;
            }
          });
        });
      } else {
        channelsListEl.innerHTML = `<div style="font-size: 11.5px; color: var(--warning-amber); text-align: center; padding: 8px 0;">${result.error || 'No se encontraron canales donde seas moderador.'}</div>`;
      }

      scanBtn.textContent = '⚡ Escanear Canales que Modero';
      scanBtn.disabled = false;
    });

    // Disconnect Twitch
    this.modal.querySelector('.disconnect-twitch-btn')?.addEventListener('click', () => {
      const profiles = storageService.getProfiles();
      profiles.twitch = null;
      storageService.saveProfiles(profiles);

      const creds = storageService.getAuthCreds();
      creds.twitchToken = '';
      creds.twitchUsername = '';
      storageService.saveAuthCreds(creds);

      if (this.onSave) this.onSave({ disconnected: 'twitch' });
      this.render();
    });

    // Verify Kick Account
    const verifyKickBtn = this.modal.querySelector('.verify-kick-btn');
    const kickInput = this.modal.querySelector('.kick-username-input');
    const kickFeedback = this.modal.querySelector('#kick-validation-feedback');

    verifyKickBtn?.addEventListener('click', async () => {
      const username = kickInput.value.trim().toLowerCase().replace('@', '');
      if (!username) return;

      verifyKickBtn.textContent = 'Consultando Kick...';
      verifyKickBtn.disabled = true;

      const res = await apiService.fetchKickChannel(username);
      kickFeedback.style.display = 'block';

      if (res.success) {
        kickFeedback.style.background = 'rgba(83, 252, 24, 0.15)';
        kickFeedback.style.color = 'var(--kick-green)';
        kickFeedback.innerHTML = `✅ <strong>Cuenta de Kick Verificada:</strong> @${res.channel.displayName} (Chatroom ID: ${res.channel.chatroomId || 'Conectado'})`;

        const profiles = storageService.getProfiles();
        profiles.kick = {
          valid: true,
          username: res.channel.displayName,
          avatar: res.channel.avatar,
          chatroomId: res.channel.chatroomId
        };
        storageService.saveProfiles(profiles);

        const creds = storageService.getAuthCreds();
        creds.kickUsername = res.channel.displayName;
        storageService.saveAuthCreds(creds);

        if (this.onSave) this.onSave({ kick: profiles.kick });
        setTimeout(() => this.render(), 1000);
      } else {
        kickFeedback.style.background = 'rgba(255, 51, 102, 0.15)';
        kickFeedback.style.color = 'var(--danger-red)';
        kickFeedback.innerHTML = `❌ ${res.error}`;
      }

      verifyKickBtn.textContent = 'Verificar Cuenta Kick';
      verifyKickBtn.disabled = false;
    });

    // Disconnect Kick
    this.modal.querySelector('.disconnect-kick-btn')?.addEventListener('click', () => {
      const profiles = storageService.getProfiles();
      profiles.kick = null;
      storageService.saveProfiles(profiles);

      const creds = storageService.getAuthCreds();
      creds.kickUsername = '';
      storageService.saveAuthCreds(creds);

      if (this.onSave) this.onSave({ disconnected: 'kick' });
      this.render();
    });

    // Demo Mode switch
    this.modal.querySelector('.demo-mode-switch')?.addEventListener('change', (e) => {
      const settings = storageService.getSettings();
      settings.demoMode = e.target.checked;
      storageService.saveSettings(settings);
      if (this.onSave) this.onSave({ demoMode: e.target.checked });
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ==========================================
// 3. CONNECTION & MOD HUB MODAL
// ==========================================

// ==========================================
// 4. HOTKEY CHEATSHEET MODAL
// ==========================================
export class HotkeysModal {
  constructor(modalElement) {
    this.modal = modalElement;
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 520px;">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h12"/></svg>
            <span>Atajos de Teclado (Hotkeys)</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body" style="gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Cerrar cajones / Modales abiertos</span>
            <span class="kbd-badge">ESC</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Abrir Registro de Moderación Real</span>
            <span class="kbd-badge">Alt + L</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Abrir Radar de Raids & Eventos</span>
            <span class="kbd-badge">Alt + R</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Alternar Modo Escudo (Raid Shield)</span>
            <span class="kbd-badge">Alt + S</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Enviar Macros Rápidos</span>
            <span class="kbd-badge">Ctrl + 1..5</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary close-modal-btn">Entendido</button>
        </div>
      </div>
    `;

    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));
  }
}

// ==========================================
// 5. UNIFIED AUTH MODAL (MATCHING REFERENCE DESIGN)
// ==========================================
export class UnifiedAuthModal {
  constructor(modalElement, onLoginSuccess) {
    this.modal = modalElement;
    this.onLoginSuccess = onLoginSuccess;
    this.emailMode = 'login'; // 'login' | 'register' | 'config'
  }

  open(defaultMode = 'login') {
    this.emailMode = defaultMode;
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const currentUser = supabaseAuthService.getCurrentUser();

    if (this.emailMode === 'kick') {
      const savedKickClientId = apiService.getKickClientId();
      const savedKickClientSecret = apiService.getKickClientSecret();
      const profiles = storageService.getProfiles?.() || {};
      const savedUsername = profiles.kick?.username || '';

      this.modal.innerHTML = `
        <div class="modal-container auth-minimal-card" style="max-width: 440px;">
          <div class="auth-minimal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #53FC18; color: #000; font-weight: 900; font-size: 13px; padding: 2px 7px; border-radius: 4px;">KICK DEV</span>
              <h3 class="auth-minimal-title" style="margin: 0;">Conectar con Kick Developer</h3>
            </div>
            <button class="auth-minimal-close close-modal-btn" title="Cerrar">✕</button>
          </div>

          <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 14px; line-height: 1.4;">
            Conecta tu cuenta de Kick usando tu App oficial de <strong>Kick Developer</strong> (OAuth 2.0) o mediante tu nombre de usuario.
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <!-- Kick OAuth 2.0 Direct Button -->
            <button id="btn-start-kick-oauth" class="minimal-submit-btn" style="background: #53FC18; color: #000; font-weight: 800; font-size: 12.5px; border-radius: 6px; box-shadow: 0 4px 14px rgba(83, 252, 24, 0.25);">
              🟢 INICIAR CON KICK OAUTH 2.0 (App Oficial)
            </button>

            <div class="auth-or-divider" style="margin: 4px 0;">
              <div class="divider-line"></div>
              <span class="divider-text">Configuración de tu App Kick Dev</span>
              <div class="divider-line"></div>
            </div>

            <div>
              <label style="font-size: 11px; font-weight:700; color:#2d3436; margin-bottom:4px; display:block;">Tu Nombre de Usuario en Kick</label>
              <input type="text" id="kick-user-input" class="minimal-input" placeholder="ej. tu_canal_kick" value="${savedUsername}">
            </div>

            <div>
              <label style="font-size: 11px; font-weight:700; color:#2d3436; margin-bottom:4px; display:block;">ID del Cliente (Kick App Client ID)</label>
              <input type="text" id="kick-client-id-input" class="minimal-input" placeholder="01M0VT0JC58YQEVGRHM8JFXQX3" value="${savedKickClientId}">
            </div>

            <div>
              <label style="font-size: 11px; font-weight:700; color:#2d3436; margin-bottom:4px; display:block;">Secreto del Cliente (Kick App Client Secret)</label>
              <input type="password" id="kick-client-secret-input" class="minimal-input" placeholder="ee10e46fccf83a105..." value="${savedKickClientSecret}">
            </div>

            <div id="kick-auth-feedback" class="minimal-auth-feedback" style="display:none;"></div>

            <button id="btn-save-kick-auth" class="minimal-submit-btn" style="background: #2f3640; color: #fff; font-size: 12px;">
              GUARDAR Y VINCULAR CUENTA DE KICK
            </button>

            <div style="background: rgba(0,0,0,0.04); border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #636e72; line-height: 1.4;">
              💡 <strong>Credenciales configuradas:</strong> App Kick Dev vinculada correctamente para consultas y moderación de chat.
            </div>

            <div style="text-align: center; margin-top: 4px;">
              <a href="#" id="btn-cancel-kick-config" style="font-size: 12px; color: #00a8ff; text-decoration: none;">← Volver a opciones de inicio</a>
            </div>
          </div>
        </div>
      `;
      this._bindEvents();
      return;
    }

    this.modal.innerHTML = `
      <div class="modal-container auth-minimal-card">
        <!-- Header -->
        <div class="auth-minimal-header">
          <h3 class="auth-minimal-title">${this.emailMode === 'register' ? 'Register with' : 'Login with'}</h3>
          <button class="auth-minimal-close close-modal-btn" title="Cerrar">✕</button>
        </div>

        <!-- 3 Circular Social Login Buttons -->
        <div class="auth-social-row">
          <!-- 1. Twitch Circle -->
          <button class="auth-social-circle circle-twitch" id="btn-auth-circle-twitch" title="Twitch (1-Clic si ya estás vinculado)">
            <svg viewBox="0 0 24 24" class="social-svg-icon"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
          </button>

          <!-- 2. Google OAuth Circle -->
          <button class="auth-social-circle circle-google" id="btn-auth-circle-google" title="Iniciar sesión con Google (1-Clic)">
            <img src="https://images.icon-icons.com/2642/PNG/512/google_logo_g_logo_icon_159348.png" style="width:22px;height:22px;object-fit:contain;" alt="Google">
          </button>

          <!-- 3. Kick Circle -->
          <button class="auth-social-circle circle-kick" id="btn-auth-circle-kick" title="Kick (1-Clic si ya estás vinculado)">
            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kick-streaming-platform-logo-icon.png" style="width:22px;height:22px;object-fit:contain;" alt="Kick">
          </button>
        </div>

        <!-- Divider with "or" -->
        <div class="auth-or-divider">
          <div class="divider-line"></div>
          <span class="divider-text">or</span>
          <div class="divider-line"></div>
        </div>

        <!-- Email & Password Form -->
        <form id="minimal-auth-form" class="auth-minimal-form">
          ${this.emailMode === 'register' ? `
            <div class="minimal-field">
              <input type="text" id="auth-email-name" class="minimal-input" placeholder="Name or Nickname" required />
            </div>
          ` : ''}

          <div class="minimal-field">
            <input type="email" id="auth-email-input" class="minimal-input" placeholder="Email" required value="${currentUser?.email || ''}" />
          </div>

          <div class="minimal-field">
            <input type="password" id="auth-password-input" class="minimal-input" placeholder="Password" required />
          </div>

          <div id="email-auth-feedback" class="minimal-auth-feedback" style="display:none;"></div>

          <!-- Bright Blue Full-Width Login Button -->
          <button type="submit" id="btn-submit-email-auth" class="minimal-submit-btn">
            ${this.emailMode === 'register' ? 'REGISTER' : 'LOGIN'}
          </button>
        </form>

        <!-- Footer Link -->
        <div class="auth-minimal-footer">
          ${this.emailMode === 'register' ? `
            <span>Already have an account? <a href="#" id="auth-toggle-mode">Login</a></span>
          ` : `
            <span>Looking to <a href="#" id="auth-toggle-mode">create an account</a> ?</span>
          `}
          <div style="margin-top: 10px;">
            <a href="#" id="auth-toggle-supabase" style="font-size: 11px; color: #95a5a6; text-decoration: none;">⚙️ Configurar Supabase</a>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    // 1. Twitch Circle Click (1-Clic Instant Enter if OAuth token exists, else Twitch OAuth redirect)
    this.modal.querySelector('#btn-auth-circle-twitch')?.addEventListener('click', () => {
      const profiles = storageService.getProfiles();
      const hub = storageService.getMasterHub();
      const twitch = (profiles.twitch && profiles.twitch.valid) ? profiles.twitch : hub.twitch;
      const hasRealToken = twitch && twitch.valid && twitch.token && twitch.token !== 'linked' && twitch.token.length > 10;
      if (hasRealToken) {
        profiles.twitch = twitch;
        if (hub.kick && hub.kick.valid) profiles.kick = hub.kick;
        storageService.saveProfiles(profiles);
        if (this.onLoginSuccess) {
          this.onLoginSuccess({ platform: 'twitch', username: twitch.login });
        }
        this.close();
      } else {
        const url = apiService.getTwitchAuthUrl();
        window.location.href = url;
      }
    });

    // 2. Google Circle Click (1-Clic Instant Enter if active Supabase session exists, else Google OAuth via Supabase)
    this.modal.querySelector('#btn-auth-circle-google')?.addEventListener('click', async () => {
      const curUser = supabaseAuthService.getCurrentUser();
      if (curUser && curUser.id) {
        const hub = storageService.getMasterHub();
        const profiles = storageService.getProfiles();
        if (hub.twitch && hub.twitch.valid) profiles.twitch = hub.twitch;
        if (hub.kick && hub.kick.valid) profiles.kick = hub.kick;
        storageService.saveProfiles(profiles);
        if (this.onLoginSuccess) {
          this.onLoginSuccess({ platform: 'google', user: curUser });
        }
        this.close();
      } else {
        const res = await supabaseAuthService.signInWithGoogle();
        if (res && !res.success) {
          const feedback = this.modal.querySelector('#email-auth-feedback');
          if (feedback) {
            feedback.style.display = 'block';
            feedback.innerHTML = `⚠️ <strong>Google Auth no activado en tu Supabase:</strong><br><small style="color:#7f8c8d;">Debes activar el proveedor Google en tu <a href="https://supabase.com/dashboard/project/kypzqrqdcqytbxuqpvzg/auth/providers" target="_blank" style="color:#00a8ff;text-decoration:underline;">Panel de Supabase &gt; Authentication &gt; Providers &gt; Google</a>. Mientras tanto puedes iniciar sesión con tu Email, Twitch o Kick.</small>`;
          }
        }
      }
    });

    // 3. Kick Circle Click (1-Clic Instant Enter if OAuth token exists, else Kick OAuth 2.0 PKCE redirect)
    this.modal.querySelector('#btn-auth-circle-kick')?.addEventListener('click', async () => {
      const profiles = storageService.getProfiles();
      const hub = storageService.getMasterHub();
      const kick = (profiles.kick && profiles.kick.valid) ? profiles.kick : hub.kick;
      const hasRealToken = kick && kick.valid && kick.token && kick.token !== 'linked' && kick.token.length > 10;
      if (hasRealToken) {
        profiles.kick = kick;
        if (hub.twitch && hub.twitch.valid) profiles.twitch = hub.twitch;
        storageService.saveProfiles(profiles);
        if (this.onLoginSuccess) {
          this.onLoginSuccess({ platform: 'kick', username: kick.username });
        }
        this.close();
      } else {
        const url = await apiService.getKickAuthUrl();
        window.location.href = url;
      }
    });

    // Mode Toggle (Login <-> Register)
    this.modal.querySelector('#auth-toggle-mode')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.emailMode = this.emailMode === 'login' ? 'register' : 'login';
      this.render();
    });

    // Supabase Config Toggle
    this.modal.querySelector('#auth-toggle-supabase')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.emailMode = 'config';
      this.render();
    });

    this.modal.querySelector('#btn-cancel-supabase-config')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.emailMode = 'login';
      this.render();
    });

    // Save Supabase Config
    this.modal.querySelector('#btn-save-supabase-config')?.addEventListener('click', () => {
      const url = this.modal.querySelector('#supabase-url-input')?.value || '';
      const key = this.modal.querySelector('#supabase-key-input')?.value || '';
      const res = supabaseAuthService.configureSupabase(url, key);
      alert(res.message);
      this.emailMode = 'login';
      this.render();
    });

    // Form Submit (Login / Register via Supabase & Email)
    const emailForm = this.modal.querySelector('#minimal-auth-form');
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = this.modal.querySelector('#auth-email-input').value.trim();
        const password = this.modal.querySelector('#auth-password-input').value;
        const name = this.modal.querySelector('#auth-email-name')?.value.trim() || '';
        const feedback = this.modal.querySelector('#email-auth-feedback');
        const submitBtn = this.modal.querySelector('#btn-submit-email-auth');

        submitBtn.disabled = true;
        submitBtn.textContent = 'PROCESANDO...';

        let res;
        if (this.emailMode === 'register') {
          res = await supabaseAuthService.signUp(email, password, name);
        } else {
          res = await supabaseAuthService.signInWithPassword(email, password);
        }

        submitBtn.disabled = false;
        submitBtn.textContent = this.emailMode === 'register' ? 'REGISTER' : 'LOGIN';

        if (res.success) {
          const hub = storageService.getMasterHub();
          const profiles = storageService.getProfiles();
          if (hub.twitch && hub.twitch.valid) profiles.twitch = hub.twitch;
          if (hub.kick && hub.kick.valid) profiles.kick = hub.kick;
          storageService.saveProfiles(profiles);

          storageService.updateMasterHubField('google', {
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.displayName,
            avatar: res.user.avatar
          });

          if (profiles.twitch || profiles.kick) {
            await supabaseAuthService.saveLinkedAccounts(res.user.id, {
              twitch: profiles.twitch,
              kick: profiles.kick,
              email: res.user.email,
              username: res.user.displayName,
              avatar: res.user.avatar
            });
          }

          if (this.onLoginSuccess) {
            this.onLoginSuccess({ platform: 'email', user: res.user });
          }
          this.close();
        } else {
          if (feedback) {
            feedback.style.display = 'block';
            feedback.textContent = res.error;
          }
        }
      });
    }
  }
}

export class UnifiedAccountHubModal {
  constructor(modalElement, { onLogout, onUpdate, onForceSync, showToast }) {
    this.modal = modalElement;
    this.onLogout = onLogout;
    this.onUpdate = onUpdate;
    this.onForceSync = onForceSync;
    this.showToast = showToast;
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const user = supabaseAuthService.getCurrentUser();
    const profiles = storageService.getProfiles();
    const masterHub = storageService.getMasterHub();

    const activeGoogle = user || masterHub.google;
    const email = activeGoogle ? activeGoogle.email : (profiles.twitch?.login ? `@${profiles.twitch.login}` : (profiles.kick?.username ? `@${profiles.kick.username}` : 'Perfil Maestro'));
    const displayName = activeGoogle ? (activeGoogle.displayName || activeGoogle.name || email.split('@')[0]) : (profiles.twitch?.login ? `@${profiles.twitch.login}` : (profiles.kick?.username ? `@${profiles.kick.username}` : 'Moderador'));
    const avatar = activeGoogle?.avatar || activeGoogle?.avatar_url || profiles.twitch?.avatar || profiles.kick?.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=orbimod';

    const twitchLinked = !!(profiles.twitch?.valid || masterHub.twitch?.valid);
    const twitchLogin = profiles.twitch?.login || masterHub.twitch?.login;

    const kickLinked = !!(profiles.kick?.valid || masterHub.kick?.valid);
    const kickUsername = profiles.kick?.username || masterHub.kick?.username;

    const googleLinked = !!activeGoogle?.email;

    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 520px; border-radius: 12px; background: #11141e; border: 1px solid rgba(255,255,255,0.1); color: #fff;">
        <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 20px;">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700;">
            <span>👑 Centro de Cuenta Unificada</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn" title="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Master Account Card -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <img src="${avatar}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid #3b82f6; object-fit: cover;" alt="Avatar">
              <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <div style="font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 6px;">
                  <span>${displayName}</span>
                  <img src="https://images.icon-icons.com/2642/PNG/512/google_logo_g_logo_icon_159348.png" style="width: 13px; height: 13px; object-fit: contain;" alt="Google">
                </div>
                <div style="font-size: 11.5px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis;">${email}</div>
                <div style="margin-top: 2px;">
                  <span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 9.5px; font-weight: 800; padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(59, 130, 246, 0.3);">
                    ${googleLinked ? '☁️ CUENTA CONECTADA' : 'PERFIL MAESTRO'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              ${googleLinked ? `
                <button id="btn-hub-unlink-google" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                  Desvincular
                </button>
              ` : `
                <button id="btn-hub-link-google" class="btn btn-secondary" style="font-size: 11px; padding: 4px 12px; display: flex; align-items: center; gap: 6px;">
                  <img src="https://images.icon-icons.com/2642/PNG/512/google_logo_g_logo_icon_159348.png" style="width: 12px; height: 12px; object-fit: contain;" alt="Google">
                  <span>Vincular Google</span>
                </button>
              `}
            </div>
          </div>

          <!-- Cloud Sync Status Bar -->
          <div style="background: rgba(59, 130, 246, 0.08); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="font-size: 11.5px; color: #93c5fd; display: flex; align-items: center; gap: 6px;">
              <span>💾</span>
              <span><strong>Nube Activa:</strong> Tus streamers y paneles se guardan en tu cuenta.</span>
            </div>
            <button id="btn-hub-force-sync" class="btn btn-primary" style="font-size: 11px; padding: 4px 12px; white-space: nowrap; background: #2563eb;">
              ☁️ Sincronizar Ahora
            </button>
          </div>

          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
            Cuentas Vinculadas a tu Perfil
          </div>

          <!-- 1. Twitch Account Card -->
          <div style="background: rgba(145, 70, 255, 0.06); border: 1px solid ${twitchLinked ? 'rgba(145, 70, 255, 0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(145, 70, 255, 0.2); display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: #bf94ff;"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #fff;">Twitch</div>
                <div style="font-size: 11.5px; color: ${twitchLinked ? '#bf94ff' : 'var(--text-dim)'};">
                  ${twitchLinked ? `@${twitchLogin} (Vinculada)` : 'No vinculada'}
                </div>
              </div>
            </div>

            <div>
              ${twitchLinked ? `
                <button id="btn-hub-unlink-twitch" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                  Desvincular
                </button>
              ` : `
                <button id="btn-hub-link-twitch" class="btn btn-primary" style="background: #9146FF; font-size: 11px; padding: 4px 12px;">
                  + Vincular Twitch
                </button>
              `}
            </div>
          </div>

          <!-- 2. Kick Account Card -->
          <div style="background: rgba(83, 252, 24, 0.05); border: 1px solid ${kickLinked ? 'rgba(83, 252, 24, 0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(83, 252, 24, 0.2); display: flex; align-items: center; justify-content: center;">
                <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kick-streaming-platform-logo-icon.png" style="width: 18px; height: 18px; object-fit: contain;" alt="Kick">
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #fff;">Kick</div>
                <div style="font-size: 11.5px; color: ${kickLinked ? '#53fc18' : 'var(--text-dim)'};">
                  ${kickLinked ? `@${kickUsername} (Vinculada)` : 'No vinculada'}
                </div>
              </div>
            </div>

            <div>
              ${kickLinked ? `
                <button id="btn-hub-unlink-kick" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">
                  Desvincular
                </button>
              ` : `
                <button id="btn-hub-link-kick" class="btn btn-primary" style="background: #53FC18; color: #000; font-weight: 800; font-size: 11px; padding: 4px 12px; display: flex; align-items: center; gap: 6px;">
                  <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/kick-streaming-platform-logo-icon.png" style="width: 14px; height: 14px; object-fit: contain;" alt="Kick">
                  <span>Vincular Kick</span>
                </button>
              `}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
            <button class="btn btn-secondary close-modal-btn" style="font-size: 11.5px; padding: 6px 16px;">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    // Force Cloud Sync Button
    this.modal.querySelector('#btn-hub-force-sync')?.addEventListener('click', async () => {
      const btn = this.modal.querySelector('#btn-hub-force-sync');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Sincronizando...';
      }
      try {
        if (this.onForceSync) {
          await this.onForceSync();
        }
        if (btn) btn.textContent = '✅ ¡Sincronizado!';
        if (this.showToast) this.showToast('☁️ Configuración y canales sincronizados con éxito en la nube', 'success');
      } catch (e) {
        if (btn) btn.textContent = '❌ Error al sincronizar';
        if (this.showToast) this.showToast('Error al conectar con la nube', 'danger');
      }
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '☁️ Sincronizar Ahora';
        }
      }, 2500);
    });

    // Link Google
    this.modal.querySelector('#btn-hub-link-google')?.addEventListener('click', async () => {
      await supabaseAuthService.signInWithGoogle();
    });

    // Unlink Google
    this.modal.querySelector('#btn-hub-unlink-google')?.addEventListener('click', async () => {
      if (confirm('¿Deseas desvincular tu cuenta de Google de tu perfil maestro?')) {
        storageService.unlinkFromMasterHub('google');
        supabaseAuthService.signOut();
        if (this.showToast) this.showToast('Cuenta de Google desvinculada', 'info');
        if (this.onUpdate) this.onUpdate();
        this.render();
      }
    });

    // Link Twitch
    this.modal.querySelector('#btn-hub-link-twitch')?.addEventListener('click', () => {
      window.location.href = apiService.getTwitchAuthUrl();
    });

    // Unlink Twitch
    this.modal.querySelector('#btn-hub-unlink-twitch')?.addEventListener('click', async () => {
      if (confirm('¿Deseas desvincular tu cuenta de Twitch de tu perfil maestro?')) {
        const profiles = storageService.getProfiles();
        delete profiles.twitch;
        storageService.saveProfiles(profiles);
        storageService.unlinkFromMasterHub('twitch');

        const user = supabaseAuthService.getCurrentUser();
        if (user && user.id) {
          await supabaseAuthService.saveLinkedAccounts(user.id, { twitch: null });
        }
        if (this.showToast) this.showToast('Cuenta de Twitch desvinculada', 'info');
        if (this.onUpdate) this.onUpdate();
        this.render();
      }
    });

    // Link Kick (Direct OAuth 2.0 PKCE Flow)
    this.modal.querySelector('#btn-hub-link-kick')?.addEventListener('click', async () => {
      const url = await apiService.getKickAuthUrl();
      window.location.href = url;
    });

    // Unlink Kick
    this.modal.querySelector('#btn-hub-unlink-kick')?.addEventListener('click', async () => {
      if (confirm('¿Deseas desvincular tu cuenta de Kick de tu perfil maestro?')) {
        const profiles = storageService.getProfiles();
        delete profiles.kick;
        storageService.saveProfiles(profiles);
        storageService.unlinkFromMasterHub('kick');

        const user = supabaseAuthService.getCurrentUser();
        if (user && user.id) {
          await supabaseAuthService.saveLinkedAccounts(user.id, { kick: null });
        }
        if (this.showToast) this.showToast('Cuenta de Kick desvinculada', 'info');
        if (this.onUpdate) this.onUpdate();
        this.render();
      }
    });
  }
}

