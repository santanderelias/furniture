import { dataService, isNativePlatform } from '../services/dataService.js';
import { i18nService } from '../services/i18nService.js';

export function renderDesktopBanner(container, serverInfo, onToggleCallback) {
  const isRunning = Boolean(serverInfo?.isRunning);
  const ip = serverInfo?.ip || '127.0.0.1';
  const port = serverInfo?.port || 8080;
  const serverUrl = `http://${ip}:${port}`;
  const isNative = isNativePlatform();

  let html = '';

  if (!isNative) {
    html = `
      <div class="server-compact-bar">
        <div class="server-info-title">
          <span class="status-indicator active"><span class="pulse-dot"></span> Conectado</span>
          <span class="server-text">Servidor del teléfono: <code>${serverUrl}</code></span>
        </div>
        <button id="btn-copy-url" class="btn btn-outline btn-sm">Copiar enlace</button>
      </div>
    `;
  } else if (!isRunning) {
    html = `
      <div class="server-compact-bar">
        <div class="server-info-title">
          <span class="status-indicator inactive"><span class="pulse-dot"></span> Inactivo</span>
          <span class="server-text">Acceso desde otros dispositivos</span>
        </div>
        <button id="btn-toggle-server" class="btn btn-outline btn-sm">Activar y mostrar datos</button>
      </div>
    `;
  } else {
    html = `
      <div class="server-banner">
        <div class="server-banner-header">
          <div class="server-info-title">
            <span>Acceso desde otros dispositivos</span>
            <span class="status-indicator active"><span class="pulse-dot"></span> Activo</span>
          </div>
          <button id="btn-toggle-server" class="btn btn-danger btn-sm">Detener acceso</button>
        </div>
        <div class="server-url-box">
          <div class="server-url-info">
            <span class="server-url-label">Abrí esta dirección en cualquier computadora o tablet en la misma red Wi-Fi:</span>
            <span class="server-url-text">${serverUrl}</span>
          </div>
          <button id="btn-copy-url" class="btn btn-outline-white btn-sm">Copiar URL</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  i18nService.apply(container);

  const btnToggle = container.querySelector('#btn-toggle-server');
  if (btnToggle) {
    btnToggle.addEventListener('click', async () => {
      btnToggle.disabled = true;
      btnToggle.textContent = isRunning ? 'Deteniendo...' : 'Iniciando...';
      try {
        if (isRunning) {
          await dataService.stopServer();
          window.showToast?.('Servidor de escritorio detenido');
        } else {
          await dataService.startServer();
          window.showToast?.(`Servidor activo en ${serverUrl}`);
        }
        if (onToggleCallback) onToggleCallback();
      } catch (err) {
        alert('Error al cambiar estado del servidor: ' + err.message);
      } finally {
        btnToggle.disabled = false;
      }
    });
  }

  const btnCopy = container.querySelector('#btn-copy-url');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(serverUrl).then(() => {
        window.showToast?.('Dirección copiada al portapapeles');
      }).catch(() => prompt('Copiar URL:', serverUrl));
    });
  }
}
