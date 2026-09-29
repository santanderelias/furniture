import { settingsService } from '../services/settingsService.js';
import { dataService, isNativePlatform } from '../services/dataService.js';
import { i18nService } from '../services/i18nService.js';

export function renderSettingsView(container, { onRefresh } = {}) {
  const isNative = isNativePlatform();

  const loadView = async () => {
    const settings = settingsService.getSettings();
    let serverInfo = { ip: '127.0.0.1', port: 8080, isRunning: false };
    try {
      serverInfo = await dataService.getServerInfo();
    } catch (e) {}

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>⚙ Application Settings & Preferences</span>
        </div>
      </div>

      <div class="settings-grid" style="display:flex; flex-direction:column; gap:1.25rem; max-width:750px;">
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:0.75rem;"><span>🌐</span> <span>Idioma</span></h3>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button id="language-es-btn" class="btn ${settings.language === 'es' ? 'btn-primary' : 'btn-outline'}">Español</button>
            <button id="language-en-btn" class="btn ${settings.language === 'en' ? 'btn-primary' : 'btn-outline'}">English</button>
          </div>
        </div>

        <!-- Theme & Appearance Card -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.5rem;">
            <span>🎨</span> Appearance & Theme
          </h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Choose your preferred color theme for low-light workshops or bright office environments.
          </p>

          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button id="theme-light-btn" class="btn ${settings.theme !== 'dark' ? 'btn-primary' : 'btn-outline'}" style="flex:1; min-width:140px; padding:0.85rem;">
              ☀️ Light Mode
            </button>
            <button id="theme-dark-btn" class="btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-outline'}" style="flex:1; min-width:140px; padding:0.85rem;">
              🌙 Dark Mode
            </button>
          </div>
        </div>

        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:0.35rem;"><span>🧾</span> <span>Facturas</span></h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:0.75rem;">
            Personaliza el nombre, teléfono, tamaño y diseño que aparecen en el PDF.
          </p>
          <button id="invoice-config-btn" class="btn btn-outline btn-sm">⚙ Configurar factura</button>
        </div>

        <!-- Inventory & Catalog Preferences Card -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.5rem;">
            <span>🪵</span> Catalog & Inventory Options
          </h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Control whether stock quantities and ready-count badges are visible to clients and sales agents.
          </p>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div>
              <div style="font-weight:600; font-size:0.9rem;">Show Stock Levels in Catalog</div>
              <div style="font-size:0.775rem; color:var(--text-muted);">
                When turned off, stock numbers are hidden, presenting items as custom built-to-order pieces.
              </div>
            </div>
            <label class="switch" style="position:relative; display:inline-block; width:50px; height:28px; flex-shrink:0;">
              <input type="checkbox" id="toggle-stock" ${settings.showStock ? 'checked' : ''} style="opacity:0; width:0; height:0;">
              <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.showStock ? 'var(--accent)' : '#cbd5e1'}; transition:0.3s; border-radius:34px;"></span>
            </label>
          </div>
        </div>

        <!-- System & Network Diagnostics Card -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1.05rem; font-weight:700; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.5rem;">
            <span>📱</span> Device & Network Mode
          </h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Hardware environment and connectivity status.
          </p>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem; font-size:0.85rem;">
            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Runtime Environment</div>
              <div style="font-weight:700; color:var(--text-main);">
                ${isNative ? '📱 Android Native (Capacitor)' : '💻 Desktop Browser Web Client'}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Local IP Address</div>
              <div style="font-weight:700; font-family:monospace; color:var(--accent);">
                ${serverInfo.ip || '127.0.0.1'}:${serverInfo.port || 8080}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Embedded Server Status</div>
              <div style="font-weight:700; color:${serverInfo.isRunning ? 'var(--success)' : 'var(--text-muted)'};">
                ${serverInfo.isRunning ? '● Active & Listening' : '○ Standby / Inactive'}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Database Storage</div>
              <div style="font-weight:700; color:var(--text-main);">
                SQLite Physical File (furniture.db)
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    i18nService.apply(container);

    // Listeners
    container.querySelector('#language-es-btn')?.addEventListener('click', () => {
      settingsService.setSetting('language', 'es');
      window.dispatchEvent(new CustomEvent('app-language-changed'));
    });
    container.querySelector('#language-en-btn')?.addEventListener('click', () => {
      settingsService.setSetting('language', 'en');
      window.dispatchEvent(new CustomEvent('app-language-changed'));
    });

    container.querySelector('#invoice-config-btn')?.addEventListener('click', showInvoiceSettings);
    container.querySelector('#theme-light-btn')?.addEventListener('click', () => {
      settingsService.setSetting('theme', 'light');
      window.showToast?.('Switched to Light Theme');
      loadView();
    });

    container.querySelector('#theme-dark-btn')?.addEventListener('click', () => {
      settingsService.setSetting('theme', 'dark');
      window.showToast?.('Switched to Dark Theme');
      loadView();
    });

    const stockToggle = container.querySelector('#toggle-stock');
    stockToggle?.addEventListener('change', () => {
      const val = stockToggle.checked;
      settingsService.setSetting('showStock', val);
      window.showToast?.(`Stock counts ${val ? 'shown' : 'hidden'}`);
      loadView();
    });
  };

  function showInvoiceSettings() {
    const invoice = settingsService.getSettings().invoice;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal-overlay" id="invoice-settings-modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Configurar factura</div>
            <button class="modal-close" id="close-invoice-settings">&times;</button>
          </div>
          <div class="modal-body">
            <form id="invoice-settings-form">
              <div class="form-group">
                <label class="form-label" for="invoice-title">Título de la factura</label>
                <input class="form-control" id="invoice-title" maxlength="80" value="${escapeHtml(invoice.title)}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="invoice-phone">Teléfono del negocio</label>
                <input class="form-control" id="invoice-phone" type="tel" maxlength="40" value="${escapeHtml(invoice.phone)}" placeholder="+52 ..." />
              </div>
              <div class="form-group">
                <label class="form-label" for="invoice-subtitle">Descripción del negocio</label>
                <input class="form-control" id="invoice-subtitle" maxlength="120" value="${escapeHtml(invoice.subtitle)}" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="invoice-page-size">Tamaño de papel</label>
                  <select class="form-control" id="invoice-page-size">
                    <option value="A4" ${invoice.pageSize === 'A4' ? 'selected' : ''}>A4</option>
                    <option value="LETTER" ${invoice.pageSize === 'LETTER' ? 'selected' : ''}>Carta (Letter)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="invoice-orientation">Orientación</label>
                  <select class="form-control" id="invoice-orientation">
                    <option value="portrait" ${invoice.orientation === 'portrait' ? 'selected' : ''}>Vertical</option>
                    <option value="landscape" ${invoice.orientation === 'landscape' ? 'selected' : ''}>Horizontal</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="invoice-layout">Diseño</label>
                <select class="form-control" id="invoice-layout">
                  <option value="classic" ${invoice.layout === 'classic' ? 'selected' : ''}>Clásico (con firmas y términos)</option>
                  <option value="compact" ${invoice.layout === 'compact' ? 'selected' : ''}>Compacto</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="invoice-footer">Mensaje al pie</label>
                <input class="form-control" id="invoice-footer" maxlength="160" value="${escapeHtml(invoice.footer)}" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="cancel-invoice-settings" type="button">Cancelar</button>
            <button class="btn btn-primary" id="save-invoice-settings" type="button">Guardar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    i18nService.apply(wrapper);
    const close = () => wrapper.remove();
    wrapper.querySelector('#close-invoice-settings').addEventListener('click', close);
    wrapper.querySelector('#cancel-invoice-settings').addEventListener('click', close);
    wrapper.querySelector('#save-invoice-settings').addEventListener('click', () => {
      const title = wrapper.querySelector('#invoice-title').value.trim();
      if (!title) {
        alert('El título de la factura es obligatorio.');
        return;
      }
      settingsService.setSetting('invoice', {
        title,
        phone: wrapper.querySelector('#invoice-phone').value.trim(),
        subtitle: wrapper.querySelector('#invoice-subtitle').value.trim(),
        pageSize: wrapper.querySelector('#invoice-page-size').value,
        orientation: wrapper.querySelector('#invoice-orientation').value,
        layout: wrapper.querySelector('#invoice-layout').value,
        footer: wrapper.querySelector('#invoice-footer').value.trim()
      });
      window.showToast?.('Configuración de factura guardada');
      close();
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  loadView();
}
