import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNativePlatform } from './dataService.js';
import { i18nService } from './i18nService.js';

const GITHUB_OWNER = 'santanderelias';
const GITHUB_REPO = 'furniture';
const DEFAULT_VERSION = '1.0.0';
const STORED_VERSION_KEY = 'furniture_active_web_version';

/**
 * Normalizes a semver tag string like "v1.0.1" -> "1.0.1"
 */
function cleanVersion(v) {
  if (!v || typeof v !== 'string') return DEFAULT_VERSION;
  return v.trim().replace(/^v/i, '');
}

/**
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

export const updaterService = {
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
    try {
      const current = await CapacitorUpdater.current();
      if (current?.bundle?.version && current.bundle.version !== 'builtin' && current.bundle.version.trim() !== '') {
        return current.bundle.version;
      }
    } catch (e) {
      // Ignore web/unsupported
    }

    try {
      const pluginVer = await CapacitorUpdater.getPluginVersion();
      if (pluginVer?.version && pluginVer.version !== 'default') {
        return pluginVer.version;
      }
    } catch (e) {
      // Ignore
    }

    const stored = localStorage.getItem(STORED_VERSION_KEY);
    if (stored) return stored;

    return DEFAULT_VERSION;
  },

  /**
   * Checks GitHub Releases for a newer version
   */
  async checkForUpdates({ owner = GITHUB_OWNER, repo = GITHUB_REPO } = {}) {
    const currentVersion = await this.getCurrentVersion();
    const endpoint = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          updateAvailable: false,
          currentVersion,
          message: 'No releases found on GitHub repository.'
        };
      }
      throw new Error(`GitHub Releases HTTP error: ${res.status} ${res.statusText}`);
    }

    const release = await res.json();
    const latestVersion = release.tag_name || release.name || '';
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const distAsset = assets.find(a => a.name === 'dist.zip');

    if (!distAsset) {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion,
        message: 'Latest release found, but missing required dist.zip asset.'
      };
    }

    const hasNewer = compareSemver(latestVersion, currentVersion) > 0;

    return {
      updateAvailable: hasNewer,
      currentVersion,
      latestVersion,
      assetUrl: distAsset.browser_download_url,
      releaseName: release.name || release.tag_name,
      publishedAt: release.published_at,
      releaseNotes: release.body || '',
      distAsset
    };
  },

  /**
   * Downloads and applies update
   */
  async downloadAndApplyUpdate(updateInfo, onProgress = null) {
    if (!updateInfo?.assetUrl) {
      throw new Error('No valid download URL provided for update.');
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

    try {
      console.log(`[Updater] Downloading update ${updateInfo.latestVersion} from ${updateInfo.assetUrl}`);
      const update = await CapacitorUpdater.download({
        url: updateInfo.assetUrl,
        version: updateInfo.latestVersion
      });

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
      throw err;
    }
  },

  /**
   * Immediately sets the bundle and restarts app
   */
  async applyAndRestart(bundle) {
    try {
      if (bundle) {
        await CapacitorUpdater.set(bundle);
      } else {
        await CapacitorUpdater.reload();
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
