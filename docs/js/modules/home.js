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
        <h1 id="hero-title">Build modular. Stay simple.</h1>
        <p>
          A mobile-first single-page app with one HTML file, one CSS file,
          and JavaScript modules orchestrated for clean navigation.
        </p>
        <div class="hero__actions">
          <button type="button" class="btn btn--primary" data-go="1">
            Explore Section 1
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
            Each screen is its own module. The orchestrator shows and hides
            them without full page reloads.
          </p>
          <span class="card__meta">Architecture</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">02</div>
          <h3>Mobile first</h3>
          <p>
            Layout starts on small screens and scales up. Navbar collapses
            into a hamburger menu on phones.
          </p>
          <span class="card__meta">Responsive</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">03</div>
          <h3>Theme &amp; storage</h3>
          <p>
            Light and dark themes persist in localStorage. Clear everything
            from Settings when you need a reset.
          </p>
          <span class="card__meta">Preferences</span>
        </article>
      </div>

      <div class="content-block">
        <h2>Placeholder content</h2>
        <p>
          This block stands in for real copy. Replace it with product
          highlights, news, or onboarding steps.
        </p>
        <div class="placeholder-bar" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--medium" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--short" aria-hidden="true"></div>
      </div>

      <div class="content-block">
        <h2>Getting started</h2>
        <p>Use the navbar to move between modules:</p>
        <ul>
          <li><strong>Home</strong> — landing page (you are here)</li>
          <li><strong>Section 1</strong> — sample feature overview</li>
          <li><strong>Section 2</strong> — more placeholder content</li>
          <li><strong>Settings</strong> — theme and localStorage tools</li>
        </ul>
      </div>

      <footer class="module-footer">
        Module 0 · Home
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
