import { dataService } from '../services/dataService.js';
import { settingsService } from '../services/settingsService.js';
import { i18nService } from '../services/i18nService.js';

export function renderProductsView(container, { onRefresh } = {}) {
  let products = [];
  let activeCategory = 'All';
  let searchTerm = '';

  const categories = ['All', 'Living Room', 'Dining Room', 'Bedroom', 'Office', 'Custom'];

  const loadData = async () => {
    try {
      products = await dataService.getProducts();
      render();
    } catch (err) {
      console.error('Error loading products:', err);
      container.innerHTML = `<div class="error-msg">Failed to load catalog: ${err.message}</div>`;
    }
  };

  const render = () => {
    const showStock = settingsService.getSettings().showStock;
    const filtered = products.filter(p => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>🪑 Product Catalog & Furniture Pieces</span>
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:normal;">(${filtered.length} items)</span>
        </div>
        <div>
          <button id="btn-add-product" class="btn btn-primary">
            ➕ Add Furniture Item
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="product-search" class="search-input" placeholder="Search catalog by piece name or wood type..." value="${escapeHtml(searchTerm)}" />
        <div class="filter-pills">
          ${categories.map(cat => `
            <button class="filter-pill ${activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🪵</div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No products found in this category</div>
          <div style="font-size: 0.85rem;">Add handcrafted products to your catalog to use in quotes and orders.</div>
        </div>
      ` : `
        <div class="grid-cards">
          ${filtered.map(item => `
            <div class="item-card product-card" data-id="${item.id}" tabindex="0" aria-label="Edit product ${escapeHtml(item.name)}">
              <div>
                <div class="item-card-header">
                  <div>
                    <div class="item-card-title">${escapeHtml(item.name)}</div>
                    <span class="badge" style="background:#fef3c7; color:#92400e; margin-top:0.25rem;">
                      ${escapeHtml(item.category || 'General')}
                    </span>
                  </div>
                  <div class="item-card-price">$${Number(item.price).toFixed(2)}</div>
                </div>

                <div style="margin-top: 0.5rem; font-size: 0.825rem; color: var(--text-muted); line-height: 1.4;">
                  ${escapeHtml(item.description || 'Custom crafted solid wood piece.')}
                </div>

                ${showStock ? `
                  <div style="margin-top: 0.75rem; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${item.stock > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
                      ${item.stock > 0 ? `● In Stock (${item.stock} ready)` : '○ Built to Order'}
                    </span>
                  </div>
                ` : ''}
              </div>

              <div class="item-card-actions">
                <button class="btn btn-outline btn-sm btn-edit-product" data-id="${item.id}">
                  ✏ Edit Piece
                </button>
                <button class="btn btn-outline btn-sm btn-delete-product" data-id="${item.id}" style="color:var(--danger);">
                  🗑 Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Listeners
    container.querySelector('#btn-add-product')?.addEventListener('click', () => showProductModal());

    const searchInput = container.querySelector('#product-search');
    searchInput?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      render();
      const el = container.querySelector('#product-search');
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });

    container.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        render();
      });
    });

    container.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const item = products.find(p => Number(p.id) === id);
        if (item) showProductModal(item);
      });
    });

    container.querySelectorAll('.product-card').forEach(card => {
      const editProduct = (event) => {
        if (event.target.closest('button')) return;
        const item = products.find(p => Number(p.id) === Number(card.dataset.id));
        if (item) showProductModal(item);
      };
      card.addEventListener('click', editProduct);
      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          editProduct(event);
        }
      });
    });

    container.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const item = products.find(p => Number(p.id) === id);
        if (confirm(`Delete piece "${item?.name}" from catalog?`)) {
          try {
            await dataService.deleteProduct(id);
            window.showToast?.('Product deleted');
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Failed to delete product: ' + err.message);
          }
        }
      });
    });
  };

  const showProductModal = (existing = null) => {
    const modalHtml = `
      <div class="modal-overlay" id="product-modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">${existing ? 'Edit Furniture Piece' : 'Add New Furniture Product'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="product-form">
              <div class="form-group">
                <label class="form-label">Piece Name *</label>
                <input type="text" id="prod-name" class="form-control" value="${escapeHtml(existing?.name || '')}" placeholder="e.g. Modern White Oak Credenza" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="prod-category" class="form-control">
                    ${categories.filter(c => c !== 'All').map(c => `
                      <option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Base Price ($) *</label>
                  <input type="number" step="0.01" id="prod-price" class="form-control" value="${existing?.price || ''}" placeholder="0.00" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Stock Ready</label>
                  <input type="number" id="prod-stock" class="form-control" value="${existing?.stock ?? 1}" min="0" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Dimensions, Wood Species & Finish Details</label>
                <textarea id="prod-desc" class="form-control" rows="3" placeholder="e.g. Dimensions: 60W x 20D x 30H inches. Solid American walnut with matte water-based finish.">${escapeHtml(existing?.description || '')}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save">
              💾 ${existing ? 'Update Piece' : 'Save to Catalog'}
            </button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
    i18nService.apply(wrapper);

    const close = () => wrapper.remove();
    document.getElementById('close-modal').addEventListener('click', close);
    document.getElementById('btn-cancel').addEventListener('click', close);

    document.getElementById('btn-save').addEventListener('click', async () => {
      const name = document.getElementById('prod-name').value.trim();
      const price = Number(document.getElementById('prod-price').value);

      if (!name || isNaN(price)) {
        alert('Piece name and a valid price are required.');
        return;
      }

      const category = document.getElementById('prod-category').value;
      const stock = Number(document.getElementById('prod-stock').value) || 0;
      const description = document.getElementById('prod-desc').value.trim();

      try {
        await dataService.saveProduct({
          id: existing?.id,
          name,
          category,
          price,
          stock,
          description
        });
        window.showToast?.(existing ? 'Product updated' : 'Piece added to catalog');
        close();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Failed to save product: ' + err.message);
      }
    });
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  loadData();
}
