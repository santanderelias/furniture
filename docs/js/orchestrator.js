/**
 * Orchestrator — registers modules and controls which one is visible.
 * Module IDs: 0 = Home, 1 = Section 1, 2 = Section 2, 99 = Settings
 */

const STORAGE_LAST_MODULE = 'app-last-module';

class Orchestrator {
  constructor() {
    /** @type {Map<number, import('./modules/base.js').Module>} */
    this.modules = new Map();
    this.activeId = null;
    this.moduleRoot = null;
    this.listeners = new Set();
  }

  /**
   * @param {HTMLElement} moduleRoot
   */
  init(moduleRoot) {
    this.moduleRoot = moduleRoot;
  }

  /**
   * @param {import('./modules/base.js').Module} module
   */
  register(module) {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} already registered; overwriting.`);
    }
    this.modules.set(module.id, module);

    if (this.moduleRoot) {
      const el = module.mount(this.moduleRoot);
      el.classList.add('module');
      el.dataset.moduleId = String(module.id);
      el.hidden = true;
    }
  }

  /**
   * Show a module by id; hide the previously active one.
   * @param {number} id
   * @param {{ silent?: boolean }} [options]
   */
  show(id, options = {}) {
    if (!this.modules.has(id)) {
      console.error(`Module ${id} is not registered.`);
      return;
    }

    if (this.activeId === id) return;

    if (this.activeId !== null && this.modules.has(this.activeId)) {
      const prev = this.modules.get(this.activeId);
      prev.hide();
      if (prev.element) {
        prev.element.classList.remove('is-active');
        prev.element.hidden = true;
      }
    }

    const next = this.modules.get(id);
    if (next.element) {
      next.element.hidden = false;
      next.element.classList.add('is-active');
    }
    next.show();
    this.activeId = id;

    try {
      localStorage.setItem(STORAGE_LAST_MODULE, String(id));
    } catch {
      /* ignore quota / private mode */
    }

    if (!options.silent) {
      this._notify({ type: 'navigate', moduleId: id });
    }

    window.scrollTo(0, 0);
  }

  /**
   * Restore last visited module or default to Home (0).
   */
  showDefault() {
    let id = 0;
    try {
      const raw = localStorage.getItem(STORAGE_LAST_MODULE);
      if (raw !== null) {
        const parsed = Number(raw);
        if (this.modules.has(parsed)) id = parsed;
      }
    } catch {
      /* ignore */
    }
    this.show(id);
  }

  /**
   * @param {number} id
   * @returns {import('./modules/base.js').Module | undefined}
   */
  get(id) {
    return this.modules.get(id);
  }

  /**
   * @returns {{ id: number, title: string }[]}
   */
  getNavItems() {
    return [...this.modules.values()]
      .filter((m) => m.navLabel)
      .sort((a, b) => a.navOrder - b.navOrder)
      .map((m) => ({ id: m.id, title: m.navLabel }));
  }

  /**
   * @param {(event: { type: string, moduleId: number }) => void} fn
   * @returns {() => void} unsubscribe
   */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * @param {{ type: string, moduleId: number }} event
   */
  _notify(event) {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

/** Shared singleton */
export const orchestrator = new Orchestrator();
