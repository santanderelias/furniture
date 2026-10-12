/**
 * Section 1 — module 1
 */

import { Module } from './base.js';

export class Section1Module extends Module {
  constructor() {
    super({
      id: 1,
      name: 'Section 1',
      navLabel: 'Section 1',
      navOrder: 1,
    });
  }

  render() {
    return `
      <header class="page-header">
        <h1>Section 1</h1>
        <p>
          A sample content module. Use this pattern for feature pages,
          docs, or any secondary view the orchestrator can display.
        </p>
      </header>

      <div class="feature-list">
        <article class="feature-item">
          <div class="feature-item__badge" aria-hidden="true">A</div>
          <div>
            <h3>Independent modules</h3>
            <p>
              Section 1 lives in its own file. The orchestrator mounts it once
              and toggles visibility when you navigate here.
            </p>
          </div>
        </article>
        <article class="feature-item">
          <div class="feature-item__badge" aria-hidden="true">B</div>
          <div>
            <h3>Shared styles</h3>
            <p>
              All presentation lives in a single CSS file — no per-module
              stylesheets, so theming stays consistent.
            </p>
          </div>
        </article>
        <article class="feature-item">
          <div class="feature-item__badge" aria-hidden="true">C</div>
          <div>
            <h3>Keyboard &amp; screen readers</h3>
            <p>
              Active nav links use <code>aria-current</code>, and modules
              announce changes via the main landmark.
            </p>
          </div>
        </article>
      </div>

      <div class="content-block content-block--spaced">
        <h2>Placeholder details</h2>
        <p>
          Lorem ipsum placeholder text for a longer article body. In a real
          app this might be fetched content or a form.
        </p>
        <div class="placeholder-bar" aria-hidden="true"></div>
        <div class="placeholder-bar" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--medium" aria-hidden="true"></div>
        <div class="placeholder-bar placeholder-bar--short" aria-hidden="true"></div>
      </div>

      <footer class="module-footer">
        Module 1 · Section 1
      </footer>
    `;
  }
}
