/**
 * NEXUS MOD DECK — MODAL DIALOGS & API ACCOUNT LINKING
 * Official Twitch Helix OAuth, Auto-Detection of Moderated Channels, Kick API
 */

import { storageService } from '../services/storageService.js';
import { automodService } from '../services/automodService.js';
import { apiService } from '../services/apiService.js';
import { supabaseAuthService } from '../services/supabaseAuthService.js';

// ==========================================
// 1. ADD CHANNEL MODAL (WITH LIVE API PREVIEWS)
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
// 3. AUTOMOD SETTINGS MODAL
// ==========================================
export class AutoModSettingsModal {
  constructor(modalElement, onSave) {
    this.modal = modalElement;
    this.onSave = onSave;
  }

  open() {
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const config = automodService.config;

    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 650px;">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Configuración de AutoMod & Filtros</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #fff;">AutoMod Activo</div>
              <div style="font-size: 11px; color: var(--text-dim);">Analiza todos los chats en tiempo real</div>
            </div>
            <input type="checkbox" class="automod-master-switch" ${config.enabled ? 'checked' : ''} style="width: 20px; height: 20px;">
          </div>

          <div class="form-group">
            <div class="form-label">
              <span>Protección contra Enlaces y Phishing</span>
              <label><input type="checkbox" class="block-links-switch" ${config.blockLinks ? 'checked' : ''}> Activar</label>
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 4px;">Lista blanca de dominios permitidos (separados por coma):</div>
            <input type="text" class="form-input whitelist-input" value="${config.linkWhitelist.join(', ')}">
          </div>

          <div class="form-group">
            <div class="form-label">
              <span>Palabras Prohibidas y Expresiones Regulares (Regex)</span>
              <span class="mono" style="font-size: 10px;">${config.blacklistWords.length} términos</span>
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 4px;">Usa palabras normales, comodines (*palabra*) o regex (/patron/i) separados por coma:</div>
            <textarea class="form-textarea blacklist-input" style="min-height: 90px;">${config.blacklistWords.join(', ')}</textarea>
          </div>

          <div class="form-group">
            <div class="form-label">
              <span>Sensibilidad de Mayúsculas (Caps Limit)</span>
              <span class="mono caps-val-label">${config.capsThreshold}%</span>
            </div>
            <input type="range" class="caps-slider" min="40" max="100" value="${config.capsThreshold}" style="accent-color: var(--twitch-purple);">
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Cancelar</button>
          <button class="btn btn-primary save-automod-btn">Guardar Reglas</button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    const capsSlider = this.modal.querySelector('.caps-slider');
    const capsLabel = this.modal.querySelector('.caps-val-label');
    capsSlider?.addEventListener('input', (e) => {
      capsLabel.textContent = `${e.target.value}%`;
    });

    const saveBtn = this.modal.querySelector('.save-automod-btn');
    saveBtn?.addEventListener('click', () => {
      const enabled = this.modal.querySelector('.automod-master-switch').checked;
      const blockLinks = this.modal.querySelector('.block-links-switch').checked;
      const whitelistRaw = this.modal.querySelector('.whitelist-input').value;
      const blacklistRaw = this.modal.querySelector('.blacklist-input').value;
      const capsThreshold = parseInt(capsSlider.value);

      const linkWhitelist = whitelistRaw.split(',').map(s => s.trim()).filter(Boolean);
      const blacklistWords = blacklistRaw.split(',').map(s => s.trim()).filter(Boolean);

      automodService.updateConfig({
        enabled,
        blockLinks,
        linkWhitelist,
        blacklistWords,
        capsThreshold
      });

      if (this.onSave) this.onSave();
      this.close();
    });
  }
}

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
            <span style="color: var(--text-main); font-size: 13px;">Abrir Cola de AutoMod</span>
            <span class="kbd-badge">Alt + A</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-main); font-size: 13px;">Abrir Registro de Auditoría</span>
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
// 5. UNIFIED AUTH MODAL (TWITCH, KICK & CORREO / SUPABASE)
// ==========================================
export class UnifiedAuthModal {
  constructor(modalElement, onLoginSuccess) {
    this.modal = modalElement;
    this.onLoginSuccess = onLoginSuccess;
    this.activeTab = 'twitch'; // 'twitch' | 'kick' | 'email'
    this.emailMode = 'login'; // 'login' | 'register' | 'config'
  }

  open(defaultTab = 'twitch') {
    this.activeTab = defaultTab;
    this.render();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  render() {
    const profiles = storageService.getProfiles();
    const creds = storageService.getAuthCreds();
    const currentUser = supabaseAuthService.getCurrentUser();

    this.modal.innerHTML = `
      <div class="modal-container auth-unified-modal" style="max-width: 520px;">
        <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <div class="brand-logo" style="width: 28px; height: 28px; font-size: 14px;">
              <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div>
              <div style="font-weight: 800; font-size: 16px; color: #fff;">Iniciar Sesión en OrbiMod</div>
              <div style="font-size: 11.5px; color: var(--text-dim);">Selecciona tu método de autenticación preferido</div>
            </div>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Auth Method Tabs -->
        <div class="auth-tabs-nav">
          <button class="auth-tab-btn ${this.activeTab === 'twitch' ? 'active' : ''}" data-tab="twitch">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
            <span>Twitch</span>
          </button>
          <button class="auth-tab-btn ${this.activeTab === 'kick' ? 'active' : ''}" data-tab="kick">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--kick-green);"></span>
            <span>Kick</span>
          </button>
          <button class="auth-tab-btn ${this.activeTab === 'email' ? 'active' : ''}" data-tab="email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>Correo / Supabase</span>
          </button>
        </div>

        <div class="modal-body auth-modal-content-area" style="padding-top: 10px;">
          <!-- TAB 1: TWITCH -->
          <div class="auth-tab-pane ${this.activeTab === 'twitch' ? 'active' : ''}" id="pane-twitch">
            <div class="auth-highlight-banner twitch">
              <div style="font-weight: 700; font-size: 13.5px; color: #fff; margin-bottom: 4px;">🟣 Conexión Oficial con Twitch Developer OAuth</div>
              <div style="font-size: 11.5px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                Conexión segura de 1-clic que auto-detecta todos los canales donde tienes rol de moderador y habilita sanciones instantáneas.
              </div>
            </div>

            ${profiles.twitch && profiles.twitch.valid ? `
              <div class="connected-account-preview twitch" style="display: flex; align-items: center; justify-content: space-between; background: rgba(145, 70, 255, 0.1); border: 1px solid rgba(145, 70, 255, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${profiles.twitch.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop'}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--twitch-purple);">
                  <div>
                    <div style="font-weight: 700; color: #fff; font-size: 13px;">@${profiles.twitch.login}</div>
                    <div style="font-size: 11px; color: var(--success-green);">● Cuenta Vinculada & Activa</div>
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-modal-relink-twitch">Re-conectar</button>
              </div>
            ` : ''}

            <button id="btn-auth-launch-twitch" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 13.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 18px var(--twitch-purple-glow);">
              <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
              <span>Conectar con Twitch en 1-Clic</span>
            </button>

            <div style="margin-top: 12px; font-size: 11px; color: var(--text-dim); text-align: center;">
              🔒 Permisos de moderación seguros vía Twitch Helix API. Tu token nunca sale de tu navegador.
            </div>
          </div>

          <!-- TAB 2: KICK -->
          <div class="auth-tab-pane ${this.activeTab === 'kick' ? 'active' : ''}" id="pane-kick">
            <div class="auth-highlight-banner kick">
              <div style="font-weight: 700; font-size: 13.5px; color: #fff; margin-bottom: 4px;">🟢 Conexión con Kick Pusher Cluster</div>
              <div style="font-size: 11.5px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                Conéctate a las salas de chat de Kick en tiempo real para moderar simultáneamente.
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label">Nombre de Usuario en Kick</label>
              <input type="text" id="auth-kick-username" class="form-input" placeholder="ej. MiUsuarioKick" value="${profiles.kick?.username || creds.kickUsername || ''}">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Token de Sesión o API (Opcional)</label>
              <input type="password" id="auth-kick-token" class="form-input" placeholder="Bearer token o déjalo vacío para modo lectura" value="${creds.kickToken || ''}">
            </div>

            <button id="btn-auth-save-kick" class="btn btn-kick" style="width: 100%; padding: 12px; font-size: 13.5px; font-weight: 700;">
              <span>Guardar & Conectar Kick</span>
            </button>
          </div>

          <!-- TAB 3: EMAIL / SUPABASE -->
          <div class="auth-tab-pane ${this.activeTab === 'email' ? 'active' : ''}" id="pane-email">
            <div style="display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              <button class="btn-text-tab ${this.emailMode === 'login' ? 'active' : ''}" id="btn-email-mode-login">Iniciar Sesión</button>
              <button class="btn-text-tab ${this.emailMode === 'register' ? 'active' : ''}" id="btn-email-mode-register">Crear Cuenta</button>
              <button class="btn-text-tab ${this.emailMode === 'config' ? 'active' : ''}" id="btn-email-mode-config" style="margin-left: auto; font-size: 11px;">⚙️ Config Supabase</button>
            </div>

            ${currentUser ? `
              <div style="background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 12.5px;">${currentUser.displayName || currentUser.email}</div>
                  <div style="font-size: 11px; color: var(--text-dim);">${currentUser.email}</div>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-email-signout" style="color: var(--danger-red);">Cerrar Sesión</button>
              </div>
            ` : ''}

            ${this.emailMode === 'config' ? `
              <!-- Supabase Custom Keys Config -->
              <div class="supabase-config-box">
                <div style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 6px;">⚡ Conectar Proyecto de Supabase</div>
                <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 10px;">Ingresa la URL y Anon Key de tu proyecto Supabase para sincronización completa en la nube.</div>
                
                <div class="form-group" style="margin-bottom: 8px;">
                  <label class="form-label" style="font-size: 11px;">Project URL</label>
                  <input type="text" id="supabase-url-input" class="form-input" placeholder="https://xyzcompany.supabase.co" value="${supabaseAuthService.supabaseConfig.url || ''}">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label" style="font-size: 11px;">Anon Public Key</label>
                  <input type="password" id="supabase-key-input" class="form-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${supabaseAuthService.supabaseConfig.anonKey || ''}">
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" id="btn-save-supabase-config">Guardar Configuración</button>
                  <button class="btn btn-secondary btn-sm" id="btn-cancel-supabase-config">Volver</button>
                </div>
              </div>
            ` : `
              <!-- Email Form -->
              <form id="email-auth-form">
                ${this.emailMode === 'register' ? `
                  <div class="form-group" style="margin-bottom: 10px;">
                    <label class="form-label">Nombre o Apodo de Moderador</label>
                    <input type="text" id="auth-email-name" class="form-input" placeholder="ej. AlexMod" required>
                  </div>
                ` : ''}

                <div class="form-group" style="margin-bottom: 10px;">
                  <label class="form-label">Correo Electrónico</label>
                  <input type="email" id="auth-email-input" class="form-input" placeholder="tu@correo.com" required value="${currentUser?.email || ''}">
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Contraseña</label>
                  <input type="password" id="auth-password-input" class="form-input" placeholder="Mínimo 6 caracteres" required>
                </div>

                <div id="email-auth-feedback" style="font-size: 12px; margin-bottom: 10px; display: none;"></div>

                <button type="submit" id="btn-submit-email-auth" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight: 700;">
                  <span>${this.emailMode === 'login' ? 'Iniciar Sesión con Correo' : 'Crear Cuenta en OrbiMod'}</span>
                </button>
              </form>
            `}
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', () => this.close()));

    // Tabs navigation
    this.modal.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    // Twitch Launch
    this.modal.querySelector('#btn-auth-launch-twitch')?.addEventListener('click', () => {
      const url = apiService.getTwitchAuthUrl();
      window.location.href = url;
    });

    this.modal.querySelector('#btn-modal-relink-twitch')?.addEventListener('click', () => {
      const url = apiService.getTwitchAuthUrl();
      window.location.href = url;
    });

    // Kick Save
    this.modal.querySelector('#btn-auth-save-kick')?.addEventListener('click', () => {
      const usernameInput = this.modal.querySelector('#auth-kick-username');
      const tokenInput = this.modal.querySelector('#auth-kick-token');
      const username = usernameInput ? usernameInput.value.trim() : '';
      const token = tokenInput ? tokenInput.value.trim() : '';

      if (!username) {
        alert('Por favor ingresa tu nombre de usuario de Kick');
        return;
      }

      const creds = storageService.getAuthCreds();
      creds.kickUsername = username;
      creds.kickToken = token;
      storageService.saveAuthCreds(creds);

      const profiles = storageService.getProfiles();
      profiles.kick = {
        valid: true,
        username: username,
        token: token
      };
      storageService.saveProfiles(profiles);

      if (this.onLoginSuccess) {
        this.onLoginSuccess({ platform: 'kick', username: username });
      }
      this.close();
    });

    // Email Mode toggles
    this.modal.querySelector('#btn-email-mode-login')?.addEventListener('click', () => {
      this.emailMode = 'login';
      this.render();
    });

    this.modal.querySelector('#btn-email-mode-register')?.addEventListener('click', () => {
      this.emailMode = 'register';
      this.render();
    });

    this.modal.querySelector('#btn-email-mode-config')?.addEventListener('click', () => {
      this.emailMode = 'config';
      this.render();
    });

    this.modal.querySelector('#btn-cancel-supabase-config')?.addEventListener('click', () => {
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

    // Sign Out Email
    this.modal.querySelector('#btn-email-signout')?.addEventListener('click', async () => {
      await supabaseAuthService.signOut();
      this.render();
    });

    // Submit Email Form
    const emailForm = this.modal.querySelector('#email-auth-form');
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = this.modal.querySelector('#auth-email-input').value.trim();
        const password = this.modal.querySelector('#auth-password-input').value;
        const name = this.modal.querySelector('#auth-email-name')?.value.trim() || '';
        const feedback = this.modal.querySelector('#email-auth-feedback');
        const submitBtn = this.modal.querySelector('#btn-submit-email-auth');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        let res;
        if (this.emailMode === 'register') {
          res = await supabaseAuthService.signUp(email, password, name);
        } else {
          res = await supabaseAuthService.signInWithPassword(email, password);
        }

        submitBtn.disabled = false;
        submitBtn.textContent = this.emailMode === 'login' ? 'Iniciar Sesión con Correo' : 'Crear Cuenta en OrbiMod';

        if (res.success) {
          if (this.onLoginSuccess) {
            this.onLoginSuccess({ platform: 'email', user: res.user });
          }
          this.close();
        } else {
          if (feedback) {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger-red)';
            feedback.textContent = res.error;
          }
        }
      });
    }
  }
}

