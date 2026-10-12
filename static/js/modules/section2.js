/**
 * Section 2 — module 2
 */

import { Module } from './base.js';

export class Section2Module extends Module {
  constructor() {
    super({
      id: 2,
      name: 'Section 2',
      navLabel: 'Section 2',
      navOrder: 2,
    });
  }

  render() {
    return `
      <header class="page-header">
        <h1>Section 2</h1>
        <p>
          Another independent view managed by the orchestrator. Cards below
          are static placeholders you can swap for real data.
        </p>
      </header>

      <div class="card-grid">
        <article class="card">
          <div class="card__icon" aria-hidden="true">★</div>
          <h3>Card Alpha</h3>
          <p>Placeholder card for a product, post, or metric summary.</p>
          <span class="card__meta">Category · Demo</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">◆</div>
          <h3>Card Beta</h3>
          <p>Second sample card. Layout reflows from one to three columns.</p>
          <span class="card__meta">Category · Demo</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">●</div>
          <h3>Card Gamma</h3>
          <p>Third sample card with muted meta text under the description.</p>
          <span class="card__meta">Category · Demo</span>
        </article>
        <article class="card">
          <div class="card__icon" aria-hidden="true">■</div>
          <h3>Card Delta</h3>
          <p>Extra card to demonstrate the responsive grid on wider screens.</p>
          <span class="card__meta">Category · Demo</span>
        </article>
      </div>

      <div class="content-block">
        <h2>Notes</h2>
        <p>
          Navigation state (last open module) is stored in localStorage so a
          refresh returns you to the same section. Theme preference is stored
          separately under the settings module.
        </p>
      </div>

      <footer class="module-footer">
        Module 2 · Section 2
      </footer>
    `;
  }
}
