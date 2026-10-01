import { settingsService } from '../services/settingsService.js';
import { dataService, isNativePlatform } from '../services/dataService.js';
import { i18nService } from '../services/i18nService.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { exportOperations } from '../services/exportService.js';

export function renderSettingsView(container, { onRefresh, openExport = false } = {}) {
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
          <span>Configuración y preferencias</span>
        </div>
      </div>

      <div class="settings-grid">
        <!-- Idioma -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.75rem;">Idioma / Language</h3>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button id="language-es-btn" class="btn ${settings.language === 'es' ? 'btn-primary' : 'btn-outline'}">Español (Argentina)</button>
            <button id="language-en-btn" class="btn ${settings.language === 'en' ? 'btn-primary' : 'btn-outline'}">English</button>
          </div>
        </div>

        <!-- Apariencia -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem;">Tema visual</h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Elegí el tema según la iluminación del taller o la oficina.
          </p>

          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button id="theme-light-btn" class="btn ${settings.theme !== 'dark' ? 'btn-primary' : 'btn-outline'}" style="flex:1; min-width:140px; padding:0.65rem;">
              Modo claro
            </button>
            <button id="theme-dark-btn" class="btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-outline'}" style="flex:1; min-width:140px; padding:0.65rem;">
              Modo oscuro
            </button>
          </div>
        </div>

        <!-- Facturación y Recibos -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem;">Configuración de facturas</h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:0.85rem;">
            Personalizá los datos de tu taller, impuestos, moneda, términos de garantía y formato del PDF.
          </p>
          <button id="invoice-config-btn" class="btn btn-primary btn-sm">Configurar datos de factura</button>
        </div>

        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem;">Exportación de datos</h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:0.85rem;">Exportá una copia completa o una plantilla vacía de las operaciones.</p>
          <button id="export-data-btn" class="btn btn-outline btn-sm">Exportar datos</button>
        </div>

        <!-- Opciones de catálogo -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem;">Opciones de catálogo e inventario</h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Definí si querés mostrar el stock disponible en las listas de productos.
          </p>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div>
              <div style="font-weight:600; font-size:0.875rem;">Mostrar stock en el catálogo</div>
              <div style="font-size:0.775rem; color:var(--text-muted);">
                Si se desactiva, los productos se presentan como muebles a pedido.
              </div>
            </div>
            <label class="switch" style="position:relative; display:inline-block; width:50px; height:28px; flex-shrink:0;">
              <input type="checkbox" id="toggle-stock" ${settings.showStock ? 'checked' : ''} style="opacity:0; width:0; height:0;">
              <span class="slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${settings.showStock ? 'var(--accent)' : '#cbd5e1'}; transition:0.3s; border-radius:34px;"></span>
            </label>
          </div>
        </div>

        <!-- Diagnóstico y red -->
        <div class="card-table-wrapper" style="padding: 1.25rem;">
          <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.35rem;">Dispositivo y red</h3>
          <p style="font-size:0.825rem; color:var(--text-muted); margin-bottom:1rem;">
            Estado del entorno y conexión de red.
          </p>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem; font-size:0.825rem;">
            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Entorno de ejecución</div>
              <div style="font-weight:700; color:var(--text-main);">
                ${isNative ? 'Android Nativo (Capacitor)' : 'Navegador Web Escritorio'}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Dirección IP local</div>
              <div style="font-weight:700; font-family:monospace; color:var(--accent);">
                ${serverInfo.ip || '127.0.0.1'}:${serverInfo.port || 8080}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Servidor integrado</div>
              <div style="font-weight:700; color:${serverInfo.isRunning ? 'var(--success)' : 'var(--text-muted)'};">
                ${serverInfo.isRunning ? 'Activo y escuchando' : 'Inactivo'}
              </div>
            </div>

            <div style="padding:0.75rem; background:var(--bg-main); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div style="color:var(--text-muted); font-size:0.75rem;">Base de datos</div>
              <div style="font-weight:700; color:var(--text-main);">
                Base de datos local SQLite (furniture.db)
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    i18nService.apply(container);

    // Event listeners
    container.querySelector('#language-es-btn')?.addEventListener('click', () => {
      settingsService.setSetting('language', 'es');
      window.dispatchEvent(new CustomEvent('app-language-changed'));
    });
    container.querySelector('#language-en-btn')?.addEventListener('click', () => {
      settingsService.setSetting('language', 'en');
      window.dispatchEvent(new CustomEvent('app-language-changed'));
    });

    container.querySelector('#invoice-config-btn')?.addEventListener('click', showInvoiceSettings);
    container.querySelector('#export-data-btn')?.addEventListener('click', showExportModal);
    container.querySelector('#theme-light-btn')?.addEventListener('click', () => {
      settingsService.setSetting('theme', 'light');
      window.showToast?.('Tema claro activado');
      loadView();
    });

    container.querySelector('#theme-dark-btn')?.addEventListener('click', () => {
      settingsService.setSetting('theme', 'dark');
      window.showToast?.('Tema oscuro activado');
      loadView();
    });

    const stockToggle = container.querySelector('#toggle-stock');
    stockToggle?.addEventListener('change', () => {
      const val = stockToggle.checked;
      settingsService.setSetting('showStock', val);
      window.showToast?.(`Stock ${val ? 'visible' : 'oculto'} en el catálogo`);
      loadView();
    });

    if (openExport) {
      openExport = false;
      showExportModal();
    }
  };

  function showInvoiceSettings() {
    const settings = settingsService.getSettings();
    const invoice = settings.invoice || {};
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal-overlay" id="invoice-settings-modal">
        <div class="modal-content" style="max-width:620px;">
          <div class="modal-header">
            <div class="modal-title">Configuración de la factura</div>
            <div class="modal-header-actions">
              <button class="modal-close" id="close-invoice-settings" aria-label="Cerrar">&times;</button>
            </div>
          </div>
          <div class="modal-body">
            <form id="invoice-settings-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="invoice-workshop-name">Nombre del negocio / taller</label>
                  <input class="form-control" id="invoice-workshop-name" maxlength="100" value="${escapeHtml(settings.workshopName || '')}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="invoice-title">Título de la factura</label>
                  <input class="form-control" id="invoice-title" maxlength="80" value="${escapeHtml(invoice.title || '')}" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="invoice-phone">Teléfono de contacto</label>
                  <input class="form-control" id="invoice-phone" type="tel" maxlength="40" value="${escapeHtml(invoice.phone || '')}" placeholder="+54 11 ..." />
                </div>
                <div class="form-group">
                  <label class="form-label" for="invoice-email">Email de contacto</label>
                  <input class="form-control" id="invoice-email" type="email" maxlength="80" value="${escapeHtml(invoice.email || '')}" placeholder="contacto@..." />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="invoice-subtitle">Descripción / Rubro del negocio</label>
                <input class="form-control" id="invoice-subtitle" maxlength="120" value="${escapeHtml(invoice.subtitle || '')}" />
              </div>

              <div class="form-group">
                <label class="form-label" for="invoice-address">Dirección del taller / showroom</label>
                <input class="form-control" id="invoice-address" maxlength="150" value="${escapeHtml(invoice.address || '')}" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="invoice-currency">Símbolo de moneda</label>
                  <input class="form-control" id="invoice-currency" maxlength="5" value="${escapeHtml(settings.currency || '$')}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="invoice-tax">Impuesto / IVA (%)</label>
                  <input class="form-control" id="invoice-tax" type="number" step="0.1" min="0" max="100" value="${Number(settings.taxRate || 0)}" />
                </div>
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
                <div class="form-group">
                  <label class="form-label" for="invoice-layout">Diseño</label>
                  <select class="form-control" id="invoice-layout">
                    <option value="classic" ${invoice.layout === 'classic' ? 'selected' : ''}>Clásico (con firmas y términos)</option>
                    <option value="compact" ${invoice.layout === 'compact' ? 'selected' : ''}>Compacto</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="invoice-terms">Términos y condiciones de garantía</label>
                <textarea class="form-control" id="invoice-terms" rows="2" maxlength="250">${escapeHtml(invoice.terms || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="invoice-footer">Mensaje de agradecimiento al pie</label>
                <input class="form-control" id="invoice-footer" maxlength="160" value="${escapeHtml(invoice.footer || '')}" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="preview-invoice-settings" type="button">Vista previa / Preview</button>
            <button class="btn btn-outline" id="cancel-invoice-settings" type="button">Cancelar</button>
            <button class="btn btn-primary" id="save-invoice-settings" type="button">Guardar cambios</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    i18nService.apply(wrapper);

    const close = () => wrapper.remove();
    wrapper.querySelector('#close-invoice-settings').addEventListener('click', close);
    wrapper.querySelector('#cancel-invoice-settings').addEventListener('click', close);
    wrapper.querySelector('#preview-invoice-settings').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const draftSettings = {
          ...settings,
          workshopName: wrapper.querySelector('#invoice-workshop-name').value.trim(),
          currency: wrapper.querySelector('#invoice-currency').value.trim() || '$',
          taxRate: Number(wrapper.querySelector('#invoice-tax').value) || 0,
          invoice: {
            ...invoice,
            title: wrapper.querySelector('#invoice-title').value.trim(),
            phone: wrapper.querySelector('#invoice-phone').value.trim(),
            email: wrapper.querySelector('#invoice-email').value.trim(),
            subtitle: wrapper.querySelector('#invoice-subtitle').value.trim(),
            address: wrapper.querySelector('#invoice-address').value.trim(),
            pageSize: wrapper.querySelector('#invoice-page-size').value,
            orientation: wrapper.querySelector('#invoice-orientation').value,
            layout: wrapper.querySelector('#invoice-layout').value,
            terms: wrapper.querySelector('#invoice-terms').value.trim(),
            footer: wrapper.querySelector('#invoice-footer').value.trim()
          }
        };
        const sampleOrder = {
          id: 1,
          status: 'Pending',
          total_amount: 950,
          deposit_amount: 250,
          items: [{ product_name: 'Mesa de muestra', quantity: 1, unit_price: 950, subtotal: 950 }]
        };
        const sampleClient = {
          name: i18nService.getLanguage() === 'en' ? 'Sample Customer' : 'Cliente de muestra',
          phone: draftSettings.invoice.phone || '—',
          address: draftSettings.invoice.address || '—'
        };
        const pdfDoc = generatePdfReceipt(sampleOrder, sampleClient, draftSettings);
        if (isNative) {
          await pdfDoc.open();
        } else {
          const previewUrl = URL.createObjectURL(await pdfDoc.getBlob());
          const previewWrapper = document.createElement('div');
          previewWrapper.innerHTML = `
            <div class="modal-overlay pdf-preview-overlay" id="invoice-preview-modal">
              <div class="modal-content pdf-preview-modal-content">
                <div class="modal-header">
                  <div class="modal-title">Vista previa de factura</div>
                  <button class="modal-close" type="button" id="close-invoice-preview" aria-label="Cerrar">&times;</button>
                </div>
                <iframe class="invoice-preview-frame" title="Vista previa de factura"></iframe>
              </div>
            </div>
          `;
          previewWrapper.querySelector('iframe').src = previewUrl;
          document.body.appendChild(previewWrapper);
          i18nService.apply(previewWrapper);
          const closePreview = () => {
            URL.revokeObjectURL(previewUrl);
            previewWrapper.remove();
          };
          previewWrapper.querySelector('#close-invoice-preview').addEventListener('click', closePreview);
          previewWrapper.querySelector('.pdf-preview-overlay').addEventListener('click', event => {
            if (event.target === event.currentTarget) closePreview();
          });
        }
      } catch (error) {
        alert(error.message || 'No se pudo preparar la vista previa.');
      } finally {
        button.disabled = false;
      }
    });
    wrapper.querySelector('#save-invoice-settings').addEventListener('click', () => {
      const title = wrapper.querySelector('#invoice-title').value.trim();
      const workshopName = wrapper.querySelector('#invoice-workshop-name').value.trim();
      if (!title || !workshopName) {
        alert('El título y el nombre del taller son obligatorios.');
        return;
      }

      settingsService.setSetting('workshopName', workshopName);
      settingsService.setSetting('currency', wrapper.querySelector('#invoice-currency').value.trim() || '$');
      settingsService.setSetting('taxRate', Number(wrapper.querySelector('#invoice-tax').value) || 0);

      settingsService.setSetting('invoice', {
        title,
        phone: wrapper.querySelector('#invoice-phone').value.trim(),
        email: wrapper.querySelector('#invoice-email').value.trim(),
        subtitle: wrapper.querySelector('#invoice-subtitle').value.trim(),
        address: wrapper.querySelector('#invoice-address').value.trim(),
        pageSize: wrapper.querySelector('#invoice-page-size').value,
        orientation: wrapper.querySelector('#invoice-orientation').value,
        layout: wrapper.querySelector('#invoice-layout').value,
        terms: wrapper.querySelector('#invoice-terms').value.trim(),
        footer: wrapper.querySelector('#invoice-footer').value.trim()
      });

      window.showToast?.('Configuración de la factura guardada');
      close();
      loadView();
    });
  }

  function showExportModal() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal-overlay" id="export-settings-modal">
        <div class="modal-content" style="max-width:520px;">
          <div class="modal-header">
            <div class="modal-title">Exportar datos</div>
            <button class="modal-close" type="button" id="close-export-settings" aria-label="Cerrar">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="export-format">Formato</label>
              <select id="export-format" class="form-control">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="sqlite">Base de datos SQLite (.db)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="export-mode">Contenido</label>
              <select id="export-mode" class="form-control">
                <option value="full">Datos completos</option>
                <option value="template">Plantilla vacía de operaciones</option>
              </select>
            </div>
            <div class="form-group" id="export-dataset-group" hidden>
              <label class="form-label" for="export-dataset">Conjunto CSV</label>
              <select id="export-dataset" class="form-control">
                <option value="Orders">Pedidos</option>
                <option value="Clients">Clientes</option>
                <option value="Products">Productos</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="cancel-export">Cancelar</button>
            <button type="button" class="btn btn-primary" id="run-export">Descargar exportación</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
    i18nService.apply(wrapper);

    const close = () => wrapper.remove();
    const format = wrapper.querySelector('#export-format');
    const mode = wrapper.querySelector('#export-mode');
    const datasetGroup = wrapper.querySelector('#export-dataset-group');
    const syncFormatOptions = () => {
      const isSqlite = format.value === 'sqlite';
      mode.disabled = isSqlite;
      if (isSqlite) mode.value = 'full';
      datasetGroup.hidden = format.value !== 'csv';
    };
    format.addEventListener('change', syncFormatOptions);
    syncFormatOptions();
    wrapper.querySelector('#close-export-settings').addEventListener('click', close);
    wrapper.querySelector('#cancel-export').addEventListener('click', close);
    wrapper.querySelector('#run-export').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await exportOperations({
          format: format.value,
          mode: mode.value,
          dataset: wrapper.querySelector('#export-dataset').value
        });
        window.showToast?.('Exportación descargada');
        close();
      } catch (error) {
        alert(error.message || 'No se pudo exportar la información.');
      } finally {
        button.disabled = false;
      }
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  loadView();
}
