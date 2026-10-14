/**
 * Home page — module 0
 * Landing section, cards, and placeholder content.
 */

import { Module } from './base.js';

export class HomeModule extends Module {
  /**
   * @param {import('../orchestrator.js').orchestrator} orchestrator
   */
  constructor(orchestrator) {
    super({
      id: 0,
      name: 'Home',
      navLabel: 'Home',
      navOrder: 0,
    });
    this.orchestrator = orchestrator;
  }

  render() {
    return `
      <section class="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Takumi. Build modular. Stay simple.</h1>
        <p>
          Takumi home page, here we can set some demos and add some useful tools.
        </p>
        <div class="hero__actions">
          <button type="button" class="btn btn--primary" data-go="1">
            Demo 1
          </button>
          <button type="button" class="btn btn--secondary" data-go="99">
            Open Settings
          </button>
        </div>
      </section>

      <h2 class="sr-only">Feature cards</h2>
      <div class="card-grid">
        <article class="card">
          <div class="card__icon" aria-hidden="true">01</div>
          <h3>Modular JS</h3>
          <p>
            content 1.
          </p>
          <span class="card__meta">Architecture (label 1)</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">02</div>
          <h3>Mobile first</h3>
          <p>
            Content 2.
          </p>
          <span class="card__meta">Responsive (Label 2)</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">03</div>
          <h3>Theme &amp; storage</h3>
          <p>
            Content 3.
          </p>
          <span class="card__meta">Preferences (Label 3)</span>
        </article>
      </div>

      <div class="content-block">
        <h2>Slider here</h2>
        <p>
          Place the slider here, big image on top, 
          small images below, this should be as simple as possible.
        </p>
        <div class="placeholder-bar" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--medium" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--short" aria-hidden="true"></div>
      </div>

      <div class="content-block">
        <h2>Last card</h2>
        <p>Here we will set up some tools:</p>
        <ul>
          <li><strong>Tool 1</strong> — pending...</li>
          <li><strong>Tool 2</strong> — pending...</li>
          <li><strong>Tool 3</strong> — pending...</li>
          <li><strong>Tool 4</strong> — pending...</li>
        </ul>
      </div>

      <footer class="module-footer">
        Takumi 2026
      </footer>
    `;
  }

  afterMount() {
    if (!this.element) return;
    this.element.addEventListener('click', (e) => {
      const btn = e.target instanceof HTMLElement ? e.target.closest('[data-go]') : null;
      if (!btn) return;
      const id = Number(btn.getAttribute('data-go'));
      if (!Number.isNaN(id)) this.orchestrator.show(id);
    });
  }
}
