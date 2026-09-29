// Settings Service for UI preferences and Invoice configuration

const SETTINGS_KEY = 'furniture_app_settings';

const defaultSettings = {
  theme: 'light',      // 'light' | 'dark'
  showStock: true,     // boolean
  language: 'es',      // 'es' | 'en'
  workshopName: "Leo Woodcrafts & Muebles",
  currency: '$',
  taxRate: 0,
  invoice: {
    title: 'FACTURA / RECIBO',
    phone: '+54 11 4567-8900',
    subtitle: 'Muebles artesanales y carpintería a medida',
    email: 'contacto@leowoodcrafts.com',
    address: 'Av. Taller 1234, Buenos Aires',
    pageSize: 'A4',
    orientation: 'portrait',
    layout: 'classic',
    footer: '¡Muchas gracias por elegir nuestros muebles artesanales!',
    terms: 'Garantía estructural de 5 años en ensambles. Madera maciza de primera calidad.'
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
          invoice: {
            ...defaultSettings.invoice,
            ...(parsed.invoice || {})
          }
        };
      }
    } catch (e) {
      console.warn('Could not read settings from storage', e);
    }
    return {
      ...defaultSettings,
      invoice: { ...defaultSettings.invoice }
    };
  },

  setSetting(key, value) {
    const current = this.getSettings();
    if (key === 'invoice') {
      current.invoice = { ...current.invoice, ...value };
    } else {
      current[key] = value;
    }
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
