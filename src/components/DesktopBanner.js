import { dataService, isNativePlatform } from '../services/dataService.js';
import { i18nService } from '../services/i18nService.js';

export function renderDesktopBanner(container, serverInfo, onToggleCallback) {
  const isRunning = Boolean(serverInfo?.isRunning);
  const ip = serverInfo?.ip || '127.0.0.1';
  const port = serverInfo?.port || 8080;
  const serverUrl = `http://${ip}:${port}`;
  const isNative = isNativePlatform();

  // If server is inactive on native host, show ONLY a compact neat bar with a button to enable & show info
  if (!isRunning && isNative) {
    container.innerHTML = `
      <div class="server-compact-bar">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="status-indicator inactive">
            <span class="pulse-dot"></span> Inactive
          </span>
          <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">
            Desktop Multi-Device Access
          </span>
        </div>
        <button id="btn-toggle-server" class="btn btn-outline btn-sm" style="font-weight:700;">
          ▶ Enable & Show Info
        </button>
      </div>
    `;
    i18nService.apply(container);

    const btnToggle = container.querySelector('#btn-toggle-server');
    btnToggle?.addEventListener('click', async () => {
      btnToggle.disabled = true;
      btnToggle.textContent = 'Starting...';
      try {
        await dataService.startServer();
        window.showToast?.(`Desktop server active at ${serverUrl}`);
        if (onToggleCallback) onToggleCallback();
      } catch (err) {
        alert('Could not start server: ' + err.message);
      } finally {
        btnToggle.disabled = false;
      }
    });
    return;
  }

  // If desktop browser mode
  if (!isNative) {
    container.innerHTML = `
      <div class="server-compact-bar" style="background:rgba(56, 189, 248, 0.08); border-color:rgba(56, 189, 248, 0.3);">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <span class="status-indicator active">
            <span class="pulse-dot"></span> Desktop Client
          </span>
          <span style="font-size:0.825rem; font-weight:600; color:var(--text-main);">
            Connected to Phone Server: <code style="color:var(--accent);">${serverUrl}</code>
          </span>
        </div>
        <button id="btn-copy-url" class="btn btn-outline btn-sm">
          📋 Copy Link
        </button>
      </div>
    `;
    i18nService.apply(container);

    container.querySelector('#btn-copy-url')?.addEventListener('click', () => {
      navigator.clipboard.writeText(serverUrl).then(() => {
        window.showToast?.('URL copied to clipboard');
      }).catch(() => prompt('Copy URL:', serverUrl));
    });
    return;
  }

  // Active state on Native Android: Full information banner with stop button & URL
  container.innerHTML = `
    <div class="server-banner">
      <div class="server-banner-header">
        <div class="server-info-title">
          <span>📡 Desktop & Multi-Device Access</span>
          <span class="status-indicator active">
            <span class="pulse-dot"></span> Active
          </span>
        </div>

        <div class="server-actions">
          <button id="btn-toggle-server" class="btn btn-danger btn-sm">
            ⏹ Stop Desktop Access
          </button>
        </div>
      </div>

      <div class="server-url-box">
        <div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 2px;">
            Open this URL on any laptop, tablet or PC connected to this Wi-Fi network:
          </div>
          <div class="server-url-text">${serverUrl}</div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button id="btn-copy-url" class="btn btn-outline-white btn-sm" title="Copy URL">
            📋 Copy URL
          </button>
        </div>
      </div>
    </div>
  `;
  i18nService.apply(container);

  const btnToggle = container.querySelector('#btn-toggle-server');
  if (btnToggle) {
    btnToggle.addEventListener('click', async () => {
      btnToggle.disabled = true;
      btnToggle.textContent = 'Stopping...';
      try {
        await dataService.stopServer();
        window.showToast?.('Desktop server stopped');
        if (onToggleCallback) onToggleCallback();
      } catch (err) {
        alert('Could not stop server: ' + err.message);
      } finally {
        btnToggle.disabled = false;
      }
    });
  }

  const btnCopy = container.querySelector('#btn-copy-url');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(serverUrl).then(() => {
        window.showToast?.('Server URL copied to clipboard: ' + serverUrl);
      }).catch(() => prompt('Copy URL:', serverUrl));
    });
  }
}
