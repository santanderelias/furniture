/**
 * Settings — module 99
 * Dark/light theme (persisted) and clear localStorage.
 */

import { Module } from './base.js';

export const THEME_KEY = 'app-theme';
export const LAST_MODULE_KEY = 'app-last-module';

/**
 * @returns {'light' | 'dark'}
 */
export function getStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') return t;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export class SettingsModule extends Module {
  constructor() {
    super({
      id: 99,
      name: 'Settings',
      navLabel: 'Settings',
      navOrder: 99,
    });
  }

  render() {
    const theme = getStoredTheme();
    return `
      <header class="page-header">
        <h1>Settings</h1>
        <p>Appearance and local data. Preferences are saved to localStorage.</p>
      </header>

      <div class="settings-panel">
        <section class="settings-group" aria-labelledby="theme-heading">
          <h2 id="theme-heading">Theme</h2>
          <p>Choose light or dark mode. Your choice is saved automatically.</p>
          <div class="theme-switch" role="group" aria-label="Color theme">
            <button
              type="button"
              class="theme-option ${theme === 'light' ? 'is-selected' : ''}"
              data-theme-value="light"
              aria-pressed="${theme === 'light'}"
            >
              <span aria-hidden="true">☀</span>
              Light
            </button>
            <button
              type="button"
              class="theme-option ${theme === 'dark' ? 'is-selected' : ''}"
              data-theme-value="dark"
              aria-pressed="${theme === 'dark'}"
            >
              <span aria-hidden="true">☾</span>
              Dark
            </button>
          </div>
          <div id="theme-toast" class="toast toast--success" role="status" aria-live="polite"></div>
        </section>

        <section class="settings-group" aria-labelledby="storage-heading">
          <h2 id="storage-heading">Local storage</h2>
          <p>
            Remove all app data stored in this browser (theme, last page, and
            any other keys). This cannot be undone.
          </p>
          <div class="settings-actions">
            <button type="button" class="btn btn--danger" id="btn-clear-storage">
              Delete localStorage
            </button>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-refresh-theme-ui">
              Re-apply theme UI
            </button>
          </div>
          <div id="storage-toast" class="toast toast--warning" role="status" aria-live="polite"></div>
        </section>
      </div>

      <footer class="module-footer">
        Module 99 · Settings
      </footer>
    `;
  }

  afterMount() {
    if (!this.element) return;

    this.element.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const themeBtn = target.closest('[data-theme-value]');
      if (themeBtn) {
        const value = themeBtn.getAttribute('data-theme-value');
        if (value === 'light' || value === 'dark') {
          applyTheme(value);
          this.syncThemeUI();
          this.showToast('theme-toast', `Theme set to ${value}. Saved to localStorage.`);
        }
        return;
      }

      if (target.closest('#btn-clear-storage')) {
        this.clearStorage();
        return;
      }

      if (target.closest('#btn-refresh-theme-ui')) {
        this.syncThemeUI();
        this.showToast('theme-toast', 'Theme UI refreshed from localStorage.');
      }
    });
  }

  show() {
    super.show();
    this.syncThemeUI();
  }

  syncThemeUI() {
    if (!this.element) return;
    const theme = getStoredTheme();
    this.element.querySelectorAll('[data-theme-value]').forEach((btn) => {
      const value = btn.getAttribute('data-theme-value');
      const selected = value === theme;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }

  clearStorage() {
    try {
      localStorage.clear();
    } catch {
      this.showToast('storage-toast', 'Could not clear localStorage (browser restriction).');
      return;
    }

    // Re-apply a sensible default theme after wipe
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const fallback = prefersDark ? 'dark' : 'light';
    applyTheme(fallback);
    this.syncThemeUI();
    this.showToast(
      'storage-toast',
      'localStorage cleared. Theme reset to system preference and re-saved.'
    );
  }

  /**
   * @param {string} id
   * @param {string} message
   */
  showToast(id, message) {
    if (!this.element) return;
    const el = this.element.querySelector(`#${id}`);
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
    }, 3500);
  }
}
