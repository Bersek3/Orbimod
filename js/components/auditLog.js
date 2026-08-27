/**
 * ORBIMOD — OFFICIAL PLATFORM MODERATOR ACTIONS DASHBOARD
 * Directly displays the official Kick (https://dashboard.kick.com/popout/{channel}/mod-actions)
 * and Twitch Mod Actions native widgets in real time.
 */

export class AuditLogDrawer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = options; // { getChannels, showToast }
    this.selectedChannel = null;
    this.selectedPlatform = 'kick';
  }

  isOpen() {
    return Boolean(this.container && this.container.classList.contains('open'));
  }

  open(initialChannel = null) {
    const channels = (this.options.getChannels ? this.options.getChannels() : []) || [];
    if (initialChannel) {
      this.selectedChannel = initialChannel.replace(/[@#]/g, '').trim().toLowerCase();
    } else if (!this.selectedChannel) {
      if (channels.length > 0) {
        this.selectedChannel = channels[0].name.toLowerCase();
        this.selectedPlatform = channels[0].platform || 'kick';
      } else {
        this.selectedChannel = 'laugamer';
        this.selectedPlatform = 'kick';
      }
    }

    this.render();
    this.container.classList.add('open');
    document.getElementById('drawer-backdrop')?.classList.add('active');
  }

  close() {
    this.container.classList.remove('open');
    document.getElementById('drawer-backdrop')?.classList.remove('active');
  }

  _getOfficialModUrl(channel, platform = 'kick') {
    const cleanChan = (channel || 'laugamer').replace(/[@#]/g, '').trim().toLowerCase();
    if (platform === 'twitch') {
      return `https://www.twitch.tv/popout/moderator/${encodeURIComponent(cleanChan)}/mod-actions`;
    }
    // Official Kick popout mod-actions dashboard
    return `https://dashboard.kick.com/popout/${encodeURIComponent(cleanChan)}/mod-actions`;
  }

  render() {
    const channels = (this.options.getChannels ? this.options.getChannels() : []) || [];

    // Ensure we have a valid selected channel
    if (!this.selectedChannel) {
      if (channels.length > 0) {
        this.selectedChannel = channels[0].name.toLowerCase();
        this.selectedPlatform = channels[0].platform || 'kick';
      } else {
        this.selectedChannel = 'laugamer';
        this.selectedPlatform = 'kick';
      }
    }

    // Determine platform of selected channel
    const matchedChan = channels.find(c => c.name.toLowerCase() === this.selectedChannel.toLowerCase());
    if (matchedChan) {
      this.selectedPlatform = matchedChan.platform || 'kick';
    }

    const isKick = this.selectedPlatform === 'kick';
    const officialUrl = this._getOfficialModUrl(this.selectedChannel, this.selectedPlatform);

    this.container.innerHTML = `
      <!-- Header -->
      <div class="drawer-header" style="padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-secondary);">
        <div class="drawer-title" style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; color: ${isKick ? '#53fc18' : '#bf94ff'};" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #fff; display: flex; align-items: center; gap: 6px;">
              <span>Registro de Moderación Oficial</span>
              <span class="mono" style="font-size: 10px; color: ${isKick ? '#53fc18' : '#bf94ff'}; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;">${this.selectedPlatform.toUpperCase()}</span>
            </div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 1px;">
              Dashboard oficial en vivo: <strong style="color: #fff;">#${this._escapeHtml(this.selectedChannel)}</strong>
            </div>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 6px;">
          <a href="${officialUrl}" target="_blank" rel="noreferrer" class="btn btn-secondary popout-window-btn" title="Abrir en ventana independiente (con tu sesión de Kick activa)" style="background: rgba(83, 252, 24, 0.12); border: 1px solid rgba(83, 252, 24, 0.3); border-radius: 6px; padding: 4px 10px; cursor: pointer; color: ${isKick ? '#53fc18' : '#bf94ff'}; text-decoration: none; display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700;">
            <svg viewBox="0 0 24 24" style="width: 13px; height: 13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Abrir en Ventana Oficial</span>
          </a>
          <button class="icon-btn-subtle close-drawer-btn" style="background: rgba(255,255,255,0.06); border: none; border-radius: 4px; padding: 6px; cursor: pointer; color: var(--text-dim);" title="Cerrar (ESC)">
            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Channel Selection Bar (Pills Tabs + Quick Switch) -->
      <div style="background: rgba(0,0,0,0.4); border-bottom: 1px solid var(--border-subtle); padding: 8px 14px; display: flex; gap: 6px; overflow-x: auto; align-items: center; white-space: nowrap;">
        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-right: 4px;">Canal:</span>
        
        ${channels.map(ch => {
          const chPlatform = ch.platform || 'kick';
          const chIsKick = chPlatform === 'kick';
          const isSelected = this.selectedChannel.toLowerCase() === ch.name.toLowerCase();
          const activeBg = chIsKick ? '#2ecc71' : '#9146ff';
          const activeBorder = chIsKick ? '#53fc18' : '#bf94ff';
          const themeBg = chIsKick ? 'rgba(83, 252, 24, 0.15)' : 'rgba(145, 70, 255, 0.15)';

          return `
            <button class="mod-channel-pill ${isSelected ? 'active' : ''}" data-channel="${this._escapeHtml(ch.name)}" data-platform="${chPlatform}" style="background: ${isSelected ? activeBg : themeBg}; color: #fff; border: 1px solid ${isSelected ? activeBorder : 'rgba(255,255,255,0.1)'}; border-radius: 20px; padding: 4px 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <span>${chIsKick ? '🟢' : '🟣'} #${this._escapeHtml(ch.name)}</span>
            </button>
          `;
        }).join('')}

        <!-- Custom Channel Input if user wants to check any other channel -->
        <form class="custom-mod-channel-form" style="display: inline-flex; align-items: center; gap: 4px; margin-left: 6px;">
          <input type="text" class="custom-channel-input" placeholder="Otro canal..." style="width: 100px; font-size: 11px; padding: 3px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 12px; color: #fff;">
          <button type="submit" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-subtle); color: #fff; font-size: 10.5px; padding: 3px 8px; border-radius: 12px; cursor: pointer;">Ir</button>
        </form>
      </div>

      <!-- Direct URL Bar & Session Notice -->
      <div style="background: rgba(0,0,0,0.2); padding: 6px 14px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; font-size: 11px; gap: 8px;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dim); font-family: var(--font-mono, monospace);">
          <span style="color: ${isKick ? '#53fc18' : '#bf94ff'};">🔗</span> ${officialUrl}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
          <a href="${officialUrl}" target="_blank" rel="noreferrer" style="color: #53fc18; font-weight: 700; text-decoration: underline; font-size: 10.5px;">
            ↗️ Abrir en Kick
          </a>
          <button class="copy-mod-url-btn" data-url="${officialUrl}" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 10.5px; white-space: nowrap;" title="Copiar enlace oficial">
            📋 Copiar Link
          </button>
        </div>
      </div>

      <!-- Full-Height Official Platform Embedded Iframe -->
      <div class="drawer-body" style="padding: 0; margin: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 135px); background: #0b0e14;">
        <iframe 
          id="official-mod-iframe"
          class="official-mod-actions-iframe"
          src="${officialUrl}"
          frameborder="0"
          scrolling="yes"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen;"
          style="width: 100%; height: 100%; border: none; background: #0b0e14;"
        ></iframe>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('.close-drawer-btn')?.addEventListener('click', () => this.close());

    // Channel Pills Switching
    this.container.querySelectorAll('.mod-channel-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedChannel = btn.dataset.channel;
        this.selectedPlatform = btn.dataset.platform || 'kick';
        this.render();
      });
    });

    // Custom Channel Form
    const customForm = this.container.querySelector('.custom-mod-channel-form');
    customForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('.custom-channel-input');
      const val = input?.value.trim().toLowerCase().replace(/[@#]/g, '');
      if (val) {
        this.selectedChannel = val;
        this.render();
      }
    });

    // Copy URL Button
    const copyBtn = this.container.querySelector('.copy-mod-url-btn');
    copyBtn?.addEventListener('click', () => {
      const url = copyBtn.dataset.url;
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = '✓ ¡Copiado!';
          setTimeout(() => { copyBtn.textContent = '📋 Copiar Link'; }, 2000);
        });
      }
    });
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}




