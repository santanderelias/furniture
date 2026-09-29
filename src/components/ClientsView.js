import { dataService } from '../services/dataService.js';
import { i18nService } from '../services/i18nService.js';

export function renderClientsView(container, { onRefresh, onSelectClientForOrder } = {}) {
  let clients = [];
  let orders = [];
  let searchTerm = '';

  const loadData = async () => {
    try {
      [clients, orders] = await Promise.all([
        dataService.getClients(),
        dataService.getOrders()
      ]);
      render();
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      container.innerHTML = `<div class="error-msg">Error al cargar clientes: ${err.message}</div>`;
    }
  };

  const render = () => {
    const filtered = clients.filter(c => {
      const q = searchTerm.toLowerCase();
      return !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q);
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>Gestión de clientes</span>
          <span class="section-count">(${filtered.length} clientes)</span>
        </div>
        <div>
          <button id="btn-add-client" class="btn btn-primary">
            Agregar cliente
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="client-search" class="search-input" placeholder="Buscar por nombre, teléfono o dirección..." value="${escapeHtml(searchTerm)}" />
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No se encontraron clientes</div>
          <div style="font-size: 0.85rem;">Agregá un cliente para comenzar a registrar sus pedidos.</div>
        </div>
      ` : `
        <div class="grid-cards">
          ${filtered.map(client => {
            const clientOrders = orders.filter(o => Number(o.client_id) === Number(client.id));
            const totalSpent = clientOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

            return `
              <div class="item-card client-card" data-id="${client.id}" tabindex="0" aria-label="Editar cliente ${escapeHtml(client.name)}">
                <div>
                  <div class="item-card-header">
                    <div>
                      <div class="item-card-title">${escapeHtml(client.name)}</div>
                      <div class="item-card-meta">${escapeHtml(client.phone || 'Sin teléfono registrado')}</div>
                    </div>
                    <span class="badge" style="background:var(--bg-subtle); color:var(--text-muted);">
                      ${clientOrders.length} pedido(s)
                    </span>
                  </div>

                  <div style="margin-top: 0.5rem; font-size: 0.825rem; color: var(--text-muted);">
                    <strong>Dirección:</strong> ${escapeHtml(client.address || 'Sin dirección especificada')}
                  </div>

                  ${client.notes ? `
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: 6px; font-style: italic; color: var(--text-muted);">
                      "${escapeHtml(client.notes)}"
                    </div>
                  ` : ''}

                  <div style="margin-top: 0.75rem; font-size: 0.825rem;">
                    <strong>Total consumido:</strong> <span style="color:var(--primary); font-weight:700;">$${totalSpent.toFixed(2)}</span>
                  </div>
                </div>

                <div class="item-card-actions">
                  <button class="btn btn-outline btn-sm btn-view-orders" data-id="${client.id}">
                    Ver pedidos
                  </button>
                  <button class="btn btn-outline btn-sm btn-edit-client" data-id="${client.id}">
                    Editar
                  </button>
                  <button class="btn btn-outline btn-sm btn-delete-client" data-id="${client.id}" style="color:var(--danger);">
                    Eliminar
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Event listeners
    container.querySelector('#btn-add-client')?.addEventListener('click', () => showClientModal());

    const searchInput = container.querySelector('#client-search');
    searchInput?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      render();
      const el = container.querySelector('#client-search');
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });

    container.querySelectorAll('.btn-edit-client').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const client = clients.find(c => Number(c.id) === id);
        if (client) showClientModal(client);
      });
    });

    container.querySelectorAll('.client-card').forEach(card => {
      const editClient = (event) => {
        if (event.target.closest('button')) return;
        const client = clients.find(c => Number(c.id) === Number(card.dataset.id));
        if (client) showClientModal(client);
      };
      card.addEventListener('click', editClient);
      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          editClient(event);
        }
      });
    });

    container.querySelectorAll('.btn-view-orders').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const client = clients.find(c => Number(c.id) === id);
        if (client) showClientOrdersModal(client);
      });
    });

    container.querySelectorAll('.btn-delete-client').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const client = clients.find(c => c.id === id);
        if (confirm(`¿Estás seguro de que querés eliminar al cliente "${client?.name}"?`)) {
          try {
            await dataService.deleteClient(id);
            window.showToast?.('Cliente eliminado');
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Error al eliminar cliente: ' + err.message);
          }
        }
      });
    });
  };

  const showClientModal = (existing = null) => {
    const modalHtml = `
      <div class="modal-overlay" id="client-modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">${existing ? 'Editar perfil del cliente' : 'Agregar nuevo cliente'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="client-form">
              <div class="form-group">
                <label class="form-label">Nombre completo *</label>
                <input type="text" id="client-name" class="form-control" value="${escapeHtml(existing?.name || '')}" placeholder="Ej. Juan Pérez" required />
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono de contacto</label>
                <input type="tel" id="client-phone" class="form-control" value="${escapeHtml(existing?.phone || '')}" placeholder="Ej. +54 11 1234-5678" />
              </div>
              <div class="form-group">
                <label class="form-label">Dirección de entrega</label>
                <input type="text" id="client-address" class="form-control" value="${escapeHtml(existing?.address || '')}" placeholder="Ej. Av. Siempreviva 742, CABA" />
              </div>
              <div class="form-group">
                <label class="form-label">Notas y preferencias del cliente</label>
                <textarea id="client-notes" class="form-control" rows="3" placeholder="Preferencia de acabados de madera, horarios de entrega...">${escapeHtml(existing?.notes || '')}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-save">
              ${existing ? 'Guardar cambios' : 'Guardar cliente'}
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
      const name = document.getElementById('client-name').value.trim();
      if (!name) {
        alert('El nombre del cliente es obligatorio.');
        return;
      }
      const phone = document.getElementById('client-phone').value.trim();
      const address = document.getElementById('client-address').value.trim();
      const notes = document.getElementById('client-notes').value.trim();

      try {
        await dataService.saveClient({
          id: existing?.id,
          name,
          phone,
          address,
          notes
        });
        window.showToast?.(existing ? 'Cliente actualizado' : 'Cliente registrado');
        close();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Error al guardar cliente: ' + err.message);
      }
    });
  };

  const showClientOrdersModal = (client) => {
    const clientOrders = orders.filter(o => Number(o.client_id) === Number(client.id));

    const modalHtml = `
      <div class="modal-overlay" id="client-orders-modal">
        <div class="modal-content" style="max-width: 650px;">
          <div class="modal-header">
            <div class="modal-title">Historial de pedidos de ${escapeHtml(client.name)}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            ${clientOrders.length === 0 ? `
              <p style="color:var(--text-muted); text-align:center; padding: 2rem;">Este cliente todavía no tiene pedidos registrados.</p>
            ` : `
              <div class="card-table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>N.º pedido</th>
                      <th>Estado</th>
                      <th>Artículos</th>
                      <th style="text-align:right;">Total</th>
                      <th style="text-align:right;">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${clientOrders.map(o => `
                      <tr>
                        <td><strong>#${String(o.id).padStart(4, '0')}</strong></td>
                        <td><span class="badge ${o.status === 'Delivered' ? 'badge-delivered' : o.status === 'In Production' ? 'badge-production' : 'badge-pending'}">${o.status === 'Delivered' ? 'Entregado' : o.status === 'In Production' ? 'En fabricación' : 'Pendiente'}</span></td>
                        <td>${(o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Mueble personalizado'}</td>
                        <td style="text-align:right; font-weight:700;">$${Number(o.total_amount).toFixed(2)}</td>
                        <td style="text-align:right; color:#b45309; font-weight:600;">$${Math.max(0, Number(o.total_amount) - Number(o.deposit_amount)).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-close">Cerrar</button>
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
    document.getElementById('btn-close').addEventListener('click', close);
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  loadData();
}
