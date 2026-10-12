/**
 * Navbar module — always visible; drives navigation via the orchestrator.
 */

export class NavbarModule {
  /**
   * @param {import('../orchestrator.js').orchestrator} orchestrator
   */
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    /** @type {HTMLElement | null} */
    this.root = null;
    this.open = false;
    this._unsub = null;
  }

  /**
   * @param {HTMLElement} root
   */
  mount(root) {
    this.root = root;
    this.root.innerHTML = this.render();
    this.bindEvents();
    this._unsub = this.orchestrator.on(() => this.syncActive());
    this.syncActive();
  }

  render() {
    const items = this.orchestrator.getNavItems();
    const links = items
      .map(
        (item) => `
      <li>
        <button
          type="button"
          class="navbar__link"
          data-nav-id="${item.id}"
          aria-current="false"
        >
          ${item.title}
        </button>
      </li>`
      )
      .join('');

    return `
      <nav class="navbar" aria-label="Main navigation">
        <button type="button" class="navbar__brand" data-nav-id="0" title="Go home">
          Modular App
        </button>
        <button
          type="button"
          class="navbar__toggle"
          aria-expanded="false"
          aria-controls="navbar-menu"
          aria-label="Toggle menu"
        >
          <span class="navbar__toggle-icon" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        </button>
        <ul id="navbar-menu" class="navbar__menu" role="list">
          ${links}
        </ul>
      </nav>
    `;
  }

  bindEvents() {
    if (!this.root) return;

    this.root.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const toggle = target.closest('.navbar__toggle');
      if (toggle) {
        this.setOpen(!this.open);
        return;
      }

      const link = target.closest('[data-nav-id]');
      if (link) {
        const id = Number(link.getAttribute('data-nav-id'));
        if (!Number.isNaN(id)) {
          this.orchestrator.show(id);
          this.setOpen(false);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.setOpen(false);
    });

    // Close mobile menu when resizing to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && this.open) this.setOpen(false);
    });
  }

  /**
   * @param {boolean} open
   */
  setOpen(open) {
    this.open = open;
    const nav = this.root?.querySelector('.navbar');
    const toggle = this.root?.querySelector('.navbar__toggle');
    if (nav) nav.classList.toggle('is-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  syncActive() {
    if (!this.root) return;
    const activeId = this.orchestrator.activeId;
    this.root.querySelectorAll('.navbar__link').forEach((btn) => {
      const id = Number(btn.getAttribute('data-nav-id'));
      const isActive = id === activeId;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  destroy() {
    if (this._unsub) this._unsub();
  }
}
