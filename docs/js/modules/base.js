/**
 * Base module interface.
 * Subclasses implement render() and optionally override show/hide.
 */

export class Module {
  /**
   * @param {{
   *   id: number,
   *   name: string,
   *   navLabel?: string | null,
   *   navOrder?: number
   * }} options
   */
  constructor({ id, name, navLabel = null, navOrder = id }) {
    this.id = id;
    this.name = name;
    this.navLabel = navLabel;
    this.navOrder = navOrder;
    /** @type {HTMLElement | null} */
    this.element = null;
    this.isVisible = false;
  }

  /**
   * Create the module DOM and append to parent.
   * @param {HTMLElement} parent
   * @returns {HTMLElement}
   */
  mount(parent) {
    this.element = document.createElement('section');
    this.element.id = `module-${this.id}`;
    this.element.setAttribute('aria-label', this.name);
    this.element.innerHTML = this.render();
    parent.appendChild(this.element);
    this.afterMount();
    return this.element;
  }

  /**
   * @returns {string} HTML markup for this module
   */
  render() {
    return `<div class="page-header"><h1>${this.name}</h1></div>`;
  }

  /** Hook after DOM is in the document */
  afterMount() {}

  show() {
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
  }
}
