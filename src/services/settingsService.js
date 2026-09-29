// Settings Service for UI preferences (Theme, Show/Hide Stock, Workshop info)

const SETTINGS_KEY = 'furniture_app_settings';

const defaultSettings = {
  theme: 'light',      // 'light' | 'dark'
  showStock: true,     // boolean
  language: 'es',
  workshopName: "Leo Woodcrafts & Furniture",
  currency: '$',
  invoice: {
    title: '',
    phone: '',
    subtitle: '',
    pageSize: 'A4',
    orientation: 'portrait',
    layout: 'classic',
    footer: ''
  }
};

export const settingsService = {
  getSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultSettings,
          ...parsed,
          invoice: { ...defaultSettings.invoice, ...(parsed.invoice || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not read settings from storage', e);
    }
    return { ...defaultSettings };
  },

  setSetting(key, value) {
    const current = this.getSettings();
    current[key] = value;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Could not write settings to storage', e);
    }
    if (key === 'theme') {
      this.applyTheme(value);
    }
    window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: current }));
    return current;
  },

  applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
  },

  init() {
    const settings = this.getSettings();
    this.applyTheme(settings.theme);
  }
};
