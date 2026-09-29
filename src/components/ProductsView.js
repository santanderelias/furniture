import { dataService } from '../services/dataService.js';
import { settingsService } from '../services/settingsService.js';
import { i18nService } from '../services/i18nService.js';

export function renderProductsView(container, { onRefresh } = {}) {
  let products = [];
  let activeCategory = 'All';
  let searchTerm = '';

  const categories = [
    { id: 'All', label: 'Todos' },
    { id: 'Living Room', label: 'Living / Living Room' },
    { id: 'Dining Room', label: 'Comedor' },
    { id: 'Bedroom', label: 'Dormitorio' },
    { id: 'Office', label: 'Oficina' },
    { id: 'Custom', label: 'A medida' }
  ];

  const loadData = async () => {
    try {
      products = await dataService.getProducts();
      render();
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
      container.innerHTML = `<div class="error-msg">Error al cargar el catálogo: ${err.message}</div>`;
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
          <span>Catálogo de muebles</span>
          <span class="section-count">(${filtered.length} productos)</span>
        </div>
        <div>
          <button id="btn-add-product" class="btn btn-primary">
            Agregar mueble
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="product-search" class="search-input" placeholder="Buscar mueble o tipo de madera..." value="${escapeHtml(searchTerm)}" />
        <div class="filter-pills">
          ${categories.map(cat => `
            <button class="filter-pill ${activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
              ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No se encontraron productos en esta categoría</div>
          <div style="font-size: 0.85rem;">Agregá muebles al catálogo para usarlos en tus pedidos y presupuestos.</div>
        </div>
      ` : `
        <div class="grid-cards">
          ${filtered.map(item => `
            <div class="item-card product-card" data-id="${item.id}" tabindex="0" aria-label="Editar producto ${escapeHtml(item.name)}">
              <div>
                <div class="item-card-header">
                  <div>
                    <div class="item-card-title">${escapeHtml(item.name)}</div>
                    <span class="badge" style="background:var(--primary-light); color:var(--primary-dark); margin-top:0.25rem;">
                      ${escapeHtml(item.category || 'General')}
                    </span>
                  </div>
                  <div class="item-card-price">$${Number(item.price).toFixed(2)}</div>
                </div>

                <div style="margin-top: 0.5rem; font-size: 0.825rem; color: var(--text-muted); line-height: 1.4;">
                  ${escapeHtml(item.description || 'Mueble artesanal de madera maciza.')}
                </div>

                ${showStock ? `
                  <div style="margin-top: 0.75rem; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: ${item.stock > 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">
                      ${item.stock > 0 ? `En stock (${item.stock} disponibles)` : 'Fabricación a pedido'}
                    </span>
                  </div>
                ` : ''}
              </div>

              <div class="item-card-actions">
                <button class="btn btn-outline btn-sm btn-edit-product" data-id="${item.id}">
                  Editar
                </button>
                <button class="btn btn-outline btn-sm btn-delete-product" data-id="${item.id}" style="color:var(--danger);">
                  Eliminar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Event listeners
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
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const item = products.find(p => Number(p.id) === id);
        if (confirm(`¿Estás seguro de que querés eliminar "${item?.name}" del catálogo?`)) {
          try {
            await dataService.deleteProduct(id);
            window.showToast?.('Producto eliminado');
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Error al eliminar producto: ' + err.message);
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
            <div class="modal-title">${existing ? 'Editar mueble' : 'Agregar mueble al catálogo'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="product-form">
              <div class="form-group">
                <label class="form-label">Nombre del mueble *</label>
                <input type="text" id="prod-name" class="form-control" value="${escapeHtml(existing?.name || '')}" placeholder="Ej. Vajillero en Guatambú y Paraíso" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Categoría</label>
                  <select id="prod-category" class="form-control">
                    ${categories.filter(c => c.id !== 'All').map(c => `
                      <option value="${c.id}" ${existing?.category === c.id ? 'selected' : ''}>${c.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Precio base ($) *</label>
                  <input type="number" step="0.01" id="prod-price" class="form-control" value="${existing?.price || ''}" placeholder="0.00" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Unidades en stock</label>
                  <input type="number" id="prod-stock" class="form-control" value="${existing?.stock ?? 1}" min="0" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Medidas, tipo de madera y acabado</label>
                <textarea id="prod-desc" class="form-control" rows="3" placeholder="Ej. Medidas: 160 x 45 x 75 cm. Madera Paraíso lustrada al aceite mate.">${escapeHtml(existing?.description || '')}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-save">
              ${existing ? 'Guardar cambios' : 'Guardar producto'}
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
        alert('El nombre y un precio válido son obligatorios.');
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
        window.showToast?.(existing ? 'Producto actualizado' : 'Mueble agregado al catálogo');
        close();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Error al guardar el producto: ' + err.message);
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
