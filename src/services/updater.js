import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { CapacitorHttp } from '@capacitor/core';
import { isNativePlatform } from './dataService.js';
import { i18nService } from './i18nService.js';

const DEFAULT_OTA_BASE_URL = 'https://santanderelias.github.io/furniture/';
const GITHUB_OWNER = 'santanderelias';
const GITHUB_REPO = 'furniture';
export const APP_BASE_VERSION = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || '1.0.0';
const STORED_VERSION_KEY = 'furniture_active_web_version';

/**
 * Normalizes a semver tag string like "v1.0.1" -> "1.0.1"
 */
export function cleanVersion(v) {
  if (!v || typeof v !== 'string') return APP_BASE_VERSION;
  return v.trim().replace(/^v/i, '');
}

/**
 * Compares two semver-like version strings
 * Returns:
 *  1 if v1 > v2
 * -1 if v1 < v2
 *  0 if v1 == v2
 */
export function compareSemver(v1, v2) {
  const p1 = cleanVersion(v1).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = cleanVersion(v2).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Resolves base URL and version.json URL
 */
export function getOtaEndpoints(customUrl = null) {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OTA_UPDATE_URL) || DEFAULT_OTA_BASE_URL;
  const rawUrl = (customUrl || envUrl || DEFAULT_OTA_BASE_URL).trim();
  let baseUrl = '';
  let versionUrl = '';

  if (rawUrl.endsWith('.json')) {
    versionUrl = rawUrl;
    baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1);
  } else {
    baseUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;
    versionUrl = `${baseUrl}version.json`;
  }
  return { baseUrl, versionUrl };
}

/**
 * Computes hexadecimal SHA-256 hash of given data (string, base64, ArrayBuffer, Blob)
 */
export async function computeSha256(data) {
  try {
    let arrayBuffer = null;
    if (typeof data === 'string') {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else if (data instanceof ArrayBuffer) {
      arrayBuffer = data;
    } else if (data && data.buffer instanceof ArrayBuffer) {
      arrayBuffer = data.buffer;
    } else if (data instanceof Blob) {
      arrayBuffer = await data.arrayBuffer();
    }
    if (!arrayBuffer) return null;
    const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    console.warn('[Updater] computeSha256 failed:', e);
    return null;
  }
}

export const updaterService = {
  /**
   * Returns current configured OTA Base URL
   */
  getBaseUrl() {
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OTA_UPDATE_URL) || DEFAULT_OTA_BASE_URL;
  },

  /**
   * Initializes updater safety contract on application boot
   */
  async init() {
    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[Updater] App boot confirmed via CapacitorUpdater.notifyAppReady()');
    } catch (e) {
      console.warn('[Updater] notifyAppReady warning (non-fatal):', e);
    }
  },

  /**
   * Gets current active bundle/web version
   */
  async getCurrentVersion() {
    if (isNativePlatform()) {
      try {
        const current = await CapacitorUpdater.current();
        if (current?.bundle?.version && current.bundle.version !== 'builtin' && current.bundle.version.trim() !== '') {
          return cleanVersion(current.bundle.version);
        }
      } catch (e) {
        // Ignore native error
      }

      try {
        const pluginVer = await CapacitorUpdater.getPluginVersion();
        if (pluginVer?.version && pluginVer.version !== 'default') {
          return cleanVersion(pluginVer.version);
        }
      } catch (e) {
        // Ignore
      }
    } else {
      const stored = localStorage.getItem(STORED_VERSION_KEY);
      if (stored) return cleanVersion(stored);
    }

    return APP_BASE_VERSION;
  },

  /**
   * Checks for updates from the configured OTA URL (version.json).
   * Returns a result object indicating success or error, along with both versions.
   */
  async checkForUpdates({ otaUrl = null, owner = GITHUB_OWNER, repo = GITHUB_REPO } = {}) {
    const currentVersion = await this.getCurrentVersion();
    const { baseUrl, versionUrl } = getOtaEndpoints(otaUrl);

    let serverData = null;
    let fetchError = null;
    let attemptedSource = versionUrl;

    // 1. Fetch static version.json with cache busting
    try {
      const cacheBustUrl = versionUrl.includes('?') 
        ? `${versionUrl}&_t=${Date.now()}` 
        : `${versionUrl}?_t=${Date.now()}`;

      // On Android / native devices, use native HTTP (bypasses WebView CORS/preflight entirely)
      if (isNativePlatform()) {
        try {
          const nativeRes = await CapacitorHttp.get({
            url: cacheBustUrl,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (nativeRes.status >= 200 && nativeRes.status < 300) {
            serverData = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
            attemptedSource = versionUrl;
          } else {
            fetchError = new Error(`El servidor respondió con código HTTP ${nativeRes.status} al consultar ${versionUrl}`);
          }
        } catch (nativeErr) {
          console.warn('[Updater] CapacitorHttp native get failed, falling back to fetch:', nativeErr);
        }
      }

      // If not native or native failed, use standard browser fetch as simple GET
      // NOTE: Do NOT send custom Cache-Control or Pragma headers here, as they trigger
      // CORS preflight OPTIONS requests that GitHub Pages rejects with 405 Method Not Allowed.
      if (!serverData && !fetchError) {
        const res = await fetch(cacheBustUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          fetchError = new Error(`El servidor respondió con código HTTP ${res.status} (${res.statusText || 'Error'}) al consultar ${versionUrl}`);
        } else {
          try {
            serverData = await res.json();
            attemptedSource = versionUrl;
          } catch (jsonErr) {
            fetchError = new Error(`La respuesta de ${versionUrl} no es un JSON válido (${jsonErr.message})`);
          }
        }
      }
    } catch (netErr) {
      console.warn(`[Updater] Static version check at ${versionUrl} failed:`, netErr);
      fetchError = netErr;
    }

    // 2. Fallback to GitHub Releases API if static version.json failed
    if (!serverData && owner && repo) {
      try {
        const ghEndpoint = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
        const res = await fetch(ghEndpoint, {
          headers: {
            Accept: 'application/vnd.github.v3+json'
          }
        });

        if (res.ok) {
          const release = await res.json();
          const assets = Array.isArray(release.assets) ? release.assets : [];
          const distAsset = assets.find(a => a.name === 'dist.zip');
          if (distAsset) {
            serverData = {
              version: release.tag_name || release.name || '',
              url: distAsset.browser_download_url,
              name: release.name || release.tag_name,
              published_at: release.published_at,
              notes: release.body || ''
            };
            attemptedSource = ghEndpoint;
            fetchError = null;
          }
        }
      } catch (ghErr) {
        console.warn('[Updater] GitHub Releases fallback check failed:', ghErr);
      }
    }

    // 3. If still no server data, report error explicitly
    if (!serverData) {
      const errorMessage = fetchError?.message || `No se pudo conectar con el servidor de actualizaciones (${versionUrl})`;
      return {
        success: false,
        error: errorMessage,
        currentVersion,
        serverVersion: null,
        source: attemptedSource,
        updateAvailable: false
      };
    }

    // 4. Validate version in server response
    const rawLatest = serverData.version || serverData.tag_name || serverData.latestVersion || '';
    if (!rawLatest) {
      return {
        success: false,
        error: `El archivo version.json no especifica un número de versión ("version").`,
        currentVersion,
        serverVersion: null,
        source: attemptedSource,
        updateAvailable: false
      };
    }

    const serverVersion = cleanVersion(rawLatest);

    // Resolve download asset URL
    let assetUrl = serverData.url || serverData.zip || serverData.assetUrl || serverData.downloadUrl || '';
    if (assetUrl) {
      try {
        assetUrl = new URL(assetUrl, baseUrl).href;
      } catch (e) {
        // Keep as-is
      }
    } else {
      assetUrl = `${baseUrl}dist.zip`;
    }

    const checksum = (serverData.checksum || serverData.sha256 || serverData.hash || '').trim();
    const hasNewer = compareSemver(serverVersion, currentVersion) > 0;

    return {
      success: true,
      updateAvailable: hasNewer,
      currentVersion,
      serverVersion,
      latestVersion: serverVersion,
      assetUrl,
      checksum,
      releaseName: serverData.name || `Versión ${serverVersion}`,
      publishedAt: serverData.buildDate || serverData.releaseDate || serverData.published_at || null,
      releaseNotes: serverData.notes || serverData.description || '',
      source: attemptedSource
    };
  },

  /**
   * Downloads and applies update
   */
  async downloadAndApplyUpdate(updateInfo, onProgress = null) {
    if (!updateInfo?.assetUrl) {
      throw new Error(i18nService.text('No se proporcionó una URL de descarga válida.'));
    }

    const checksum = (updateInfo.checksum || '').trim();

    // Security contract: Capgo v6 and our integrity policy require SHA-256 checksum
    if (!checksum) {
      const missingErr = new Error(i18nService.text('El archivo version.json en el servidor no incluye el checksum criptográfico (SHA-256).'));
      missingErr.detail = {
        category: 'CHECKSUM_MISSING',
        originalError: 'Missing SHA-256 checksum in version.json',
        url: updateInfo.assetUrl,
        version: updateInfo.latestVersion,
        expectedChecksum: 'No especificado en version.json',
        actualChecksum: null,
        httpStatus: 200,
        reason: 'El manifiesto version.json publicado en el servidor carece del campo "checksum" (SHA-256) requerido. Por seguridad, no se puede verificar la autenticidad del paquete.',
        recommendation: 'Asegurate de ejecutar el script build.sh y subir los archivos docs/dist.zip y docs/version.json a GitHub con "git push".'
      };
      throw missingErr;
    }

    if (!isNativePlatform()) {
      // Browser environment fallback simulation
      console.log(`[Updater] Simulated web download of version ${updateInfo.latestVersion}`);
      if (typeof onProgress === 'function') {
        onProgress(50);
        await new Promise(r => setTimeout(r, 200));
        onProgress(100);
      }
      localStorage.setItem(STORED_VERSION_KEY, updateInfo.latestVersion);
      this.showUpdateReadyBanner(null);
      return { version: updateInfo.latestVersion, webSimulated: true };
    }

    let downloadListener = null;
    if (typeof onProgress === 'function') {
      try {
        downloadListener = await CapacitorUpdater.addListener('download', (event) => {
          if (event && typeof event.percent === 'number') {
            onProgress(Math.round(event.percent));
          }
        });
      } catch (e) {
        console.warn('[Updater] Could not attach download listener:', e);
      }
    }

    const downloadOptions = {
      url: updateInfo.assetUrl,
      version: updateInfo.latestVersion,
      checksum
    };

    try {
      console.log(`[Updater] Downloading update ${updateInfo.latestVersion} from ${updateInfo.assetUrl} (SHA-256: ${checksum})`);
      const update = await CapacitorUpdater.download(downloadOptions);

      if (downloadListener) {
        await downloadListener.remove();
        downloadListener = null;
      }

      localStorage.setItem(STORED_VERSION_KEY, updateInfo.latestVersion);

      // Inform user with banner and allow immediate or deferred restart
      this.showUpdateReadyBanner(update);
      return update;
    } catch (err) {
      if (downloadListener) {
        try { await downloadListener.remove(); } catch (e) {}
      }
      console.error('[Updater] Download or activation failed:', err);

      const originalError = err.message || String(err);

      // Run diagnostic check to identify the exact cause (checksum mismatch, 404, network, or storage)
      let diagDetail = {
        category: 'DOWNLOAD_FAILED',
        originalError,
        url: updateInfo.assetUrl,
        version: updateInfo.latestVersion,
        expectedChecksum: checksum,
        actualChecksum: null,
        httpStatus: null,
        reason: 'Error durante la descarga o validación en el dispositivo.',
        recommendation: 'Verificá tu conexión a internet y que el archivo dist.zip esté disponible en el servidor.'
      };

      try {
        let rawData = null;
        let status = null;

        if (isNativePlatform()) {
          const check = await CapacitorHttp.get({
            url: updateInfo.assetUrl,
            responseType: 'arraybuffer'
          });
          status = check.status;
          rawData = check.data;
        } else {
          const check = await fetch(updateInfo.assetUrl);
          status = check.status;
          if (check.ok) {
            rawData = await check.arrayBuffer();
          }
        }

        diagDetail.httpStatus = status;

        if (status === 404) {
          diagDetail.category = 'FILE_NOT_FOUND';
          diagDetail.reason = 'El archivo dist.zip no se encontró en el servidor (HTTP 404 Not Found).';
          diagDetail.recommendation = 'Verificá que dist.zip exista en la carpeta docs/ y esté publicado en GitHub Pages.';
        } else if (status && status >= 400) {
          diagDetail.category = 'HTTP_ERROR';
          diagDetail.reason = `El servidor web respondió con un error HTTP ${status}.`;
          diagDetail.recommendation = 'Revisá la configuración de acceso o permisos en GitHub Pages.';
        } else if (rawData) {
          const computedHash = await computeSha256(rawData);
          diagDetail.actualChecksum = computedHash;

          if (computedHash && computedHash.toLowerCase() !== checksum.toLowerCase()) {
            diagDetail.category = 'CHECKSUM_MISMATCH';
            diagDetail.reason = `Fallo de verificación de integridad (Checksum Mismatch): El hash SHA-256 del archivo dist.zip en el servidor no coincide con el valor esperado indicado en version.json.`;
            diagDetail.recommendation = `El archivo dist.zip en el servidor no coincide con el manifest publicado. Ejecutá build.sh y subí los cambios con git push.`;
          } else {
            diagDetail.category = 'UNZIP_OR_STORAGE';
            diagDetail.reason = 'El archivo dist.zip se descargó y su checksum es correcto, pero el plugin Capgo no pudo desempaquetarlo (posible archivo zip dañado o falta de espacio de almacenamiento).';
            diagDetail.recommendation = 'Verificá el espacio libre en el dispositivo y que el archivo dist.zip sea un archivo ZIP válido.';
          }
        }
      } catch (diagNetErr) {
        diagDetail.category = 'NETWORK_ERROR';
        diagDetail.reason = `Error de conexión de red al intentar descargar el paquete (${diagNetErr.message || 'Sin conexión o tiempo de espera agotado'}).`;
        diagDetail.recommendation = 'Comprobá la conexión Wi-Fi o datos móviles de tu dispositivo.';
      }

      const enhancedError = new Error(diagDetail.reason);
      enhancedError.detail = diagDetail;
      throw enhancedError;
    }
  },

  /**
   * Immediately sets the bundle and restarts app
   */
  async applyAndRestart(bundle) {
    try {
      if (bundle && isNativePlatform()) {
        await CapacitorUpdater.set(bundle);
      } else if (isNativePlatform()) {
        await CapacitorUpdater.reload();
      } else {
        window.location.reload();
      }
    } catch (e) {
      console.error('[Updater] Reload failed:', e);
      window.location.reload();
    }
  },

  /**
   * Displays the "Update ready! Tap to restart app" UI banner
   */
  showUpdateReadyBanner(bundle) {
    const existing = document.getElementById('ota-update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ota-update-banner';
    banner.className = 'ota-update-banner';
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:1.1rem;">🚀</span>
        <span style="font-size:0.875rem; font-weight:600;">
          ${i18nService.text('¡Actualización lista! Tocá para reiniciar la app')}
        </span>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button type="button" class="btn-restart" id="btn-ota-restart">
          ${i18nService.text('Reiniciar app')}
        </button>
      </div>
    `;

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.prepend(banner);
    } else {
      document.body.prepend(banner);
    }

    banner.querySelector('#btn-ota-restart')?.addEventListener('click', async () => {
      await this.applyAndRestart(bundle);
    });
  }
};
