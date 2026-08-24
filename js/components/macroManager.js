/**
 * NEXUS MOD DECK — MACROS & CANNED MESSAGES MANAGER MODAL
 */

import { storageService } from '../services/storageService.js';

export class MacroManagerModal {
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
    const macros = storageService.getMacros();

    this.modal.innerHTML = `
      <div class="modal-container" style="max-width: 620px;">
        <div class="modal-header">
          <div class="modal-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h12"/></svg>
            <span>Gestor de Macros y Respuestas Rápidas</span>
          </div>
          <button class="icon-btn-subtle close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Add New Macro Form -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div class="form-label">Añadir Nuevo Macro</div>
            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 8px;">
              <input type="text" class="form-input new-macro-name" placeholder="Título (Ej. !discord)">
              <select class="form-select new-macro-hotkey">
                <option value="">Sin Atajo</option>
                <option value="Ctrl+1">Ctrl + 1</option>
                <option value="Ctrl+2">Ctrl + 2</option>
                <option value="Ctrl+3">Ctrl + 3</option>
                <option value="Ctrl+4">Ctrl + 4</option>
                <option value="Ctrl+5">Ctrl + 5</option>
                <option value="Ctrl+6">Ctrl + 6</option>
                <option value="Ctrl+7">Ctrl + 7</option>
                <option value="Ctrl+8">Ctrl + 8</option>
                <option value="Ctrl+9">Ctrl + 9</option>
              </select>
            </div>
            <textarea class="form-textarea new-macro-text" placeholder="Texto que se enviará al chat..." style="min-height: 60px;"></textarea>
            <button class="btn btn-primary add-macro-submit-btn" style="align-self: flex-end;">
              <span>+ Guardar Macro</span>
            </button>
          </div>

          <!-- Existing Macros List -->
          <div class="form-label" style="margin-top: 6px;">Macros Activos (${macros.length})</div>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
            ${macros.map(m => `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; color: #fff; font-size: 13px;">${this._escapeHtml(m.name)}</span>
                    ${m.hotkey ? `<span class="kbd-badge">${m.hotkey}</span>` : ''}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${this._escapeHtml(m.text)}
                  </div>
                </div>
                <button class="icon-btn-subtle delete-macro-btn" data-macro-id="${m.id}" title="Eliminar Macro" style="color: var(--danger-red);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            `).join('')}
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
    this.modal.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Add Macro
    const addBtn = this.modal.querySelector('.add-macro-submit-btn');
    const nameInput = this.modal.querySelector('.new-macro-name');
    const hotkeySelect = this.modal.querySelector('.new-macro-hotkey');
    const textInput = this.modal.querySelector('.new-macro-text');

    addBtn?.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const text = textInput.value.trim();
      const hotkey = hotkeySelect.value;

      if (!name || !text) {
        alert('Por favor introduce un nombre y el texto del macro.');
        return;
      }

      const macros = storageService.getMacros();
      macros.push({
        id: 'macro-' + Date.now(),
        name: name,
        text: text,
        hotkey: hotkey || null
      });

      storageService.saveMacros(macros);
      if (this.onSave) this.onSave(macros);
      this.render();
    });

    // Delete Macro
    this.modal.querySelectorAll('.delete-macro-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.macroId;
        let macros = storageService.getMacros();
        macros = macros.filter(m => m.id !== id);
        storageService.saveMacros(macros);
        if (this.onSave) this.onSave(macros);
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
