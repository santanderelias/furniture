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
      console.error('Error loading clients:', err);
      container.innerHTML = `<div class="error-msg">Failed to load clients: ${err.message}</div>`;
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
          <span>👥 Clients CRM</span>
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:normal;">(${filtered.length} clients)</span>
        </div>
        <div>
          <button id="btn-add-client" class="btn btn-primary">
            ➕ Add Client
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="client-search" class="search-input" placeholder="Search by client name, phone or address..." value="${escapeHtml(searchTerm)}" />
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👥</div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No clients found</div>
          <div style="font-size: 0.85rem;">Add a new client contact to begin tracking orders.</div>
        </div>
      ` : `
        <div class="grid-cards">
          ${filtered.map(client => {
            const clientOrders = orders.filter(o => Number(o.client_id) === Number(client.id));
            const totalSpent = clientOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

            return `
              <div class="item-card client-card" data-id="${client.id}" tabindex="0" aria-label="Edit client ${escapeHtml(client.name)}">
                <div>
                  <div class="item-card-header">
                    <div>
                      <div class="item-card-title">${escapeHtml(client.name)}</div>
                      <div class="item-card-meta">${escapeHtml(client.phone || 'No phone provided')}</div>
                    </div>
                    <span class="badge" style="background:#f1f5f9; color:var(--text-muted);">
                      ${clientOrders.length} order(s)
                    </span>
                  </div>

                  <div style="margin-top: 0.5rem; font-size: 0.825rem; color: var(--text-muted);">
                    📍 ${escapeHtml(client.address || 'No address specified')}
                  </div>

                  ${client.notes ? `
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; font-style: italic; color: #475569;">
                      "${escapeHtml(client.notes)}"
                    </div>
                  ` : ''}

                  <div style="margin-top: 0.75rem; font-size: 0.825rem;">
                    <strong>Total Value:</strong> <span style="color:var(--primary); font-weight:700;">$${totalSpent.toFixed(2)}</span>
                  </div>
                </div>

                <div class="item-card-actions">
                  <button class="btn btn-outline btn-sm btn-view-orders" data-id="${client.id}">
                    📋 View Orders
                  </button>
                  <button class="btn btn-outline btn-sm btn-edit-client" data-id="${client.id}">
                    ✏ Edit
                  </button>
                  <button class="btn btn-outline btn-sm btn-delete-client" data-id="${client.id}" style="color:var(--danger);">
                    🗑
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Listeners
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
      btn.addEventListener('click', () => {
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
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const client = clients.find(c => Number(c.id) === id);
        if (client) showClientOrdersModal(client);
      });
    });

    container.querySelectorAll('.btn-delete-client').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const client = clients.find(c => c.id === id);
        if (confirm(`Are you sure you want to delete client "${client?.name}"?`)) {
          try {
            await dataService.deleteClient(id);
            window.showToast?.(`Client deleted`);
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Failed to delete client: ' + err.message);
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
            <div class="modal-title">${existing ? 'Edit Client Profile' : 'Add New Client'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="client-form">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" id="client-name" class="form-control" value="${escapeHtml(existing?.name || '')}" placeholder="e.g. John Doe" required />
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" id="client-phone" class="form-control" value="${escapeHtml(existing?.phone || '')}" placeholder="e.g. +1 (555) 000-0000" />
              </div>
              <div class="form-group">
                <label class="form-label">Delivery Address / Location</label>
                <input type="text" id="client-address" class="form-control" value="${escapeHtml(existing?.address || '')}" placeholder="e.g. 123 Main St, Suite 4" />
              </div>
              <div class="form-group">
                <label class="form-label">Workshop / Preferences Notes</label>
                <textarea id="client-notes" class="form-control" rows="3" placeholder="Wood finish preferences, delivery hours, custom requests...">${escapeHtml(existing?.notes || '')}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save">
              💾 ${existing ? 'Update Client' : 'Save Client'}
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
        alert('Client name is required.');
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
        window.showToast?.(existing ? 'Client updated' : 'Client created');
        close();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Failed to save client: ' + err.message);
      }
    });
  };

  const showClientOrdersModal = (client) => {
    const clientOrders = orders.filter(o => Number(o.client_id) === Number(client.id));

    const modalHtml = `
      <div class="modal-overlay" id="client-orders-modal">
        <div class="modal-content" style="max-width: 650px;">
          <div class="modal-header">
            <div class="modal-title">📦 Order History for ${escapeHtml(client.name)}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            ${clientOrders.length === 0 ? `
              <p style="color:var(--text-muted); text-align:center; padding: 2rem;">No orders registered for this client yet.</p>
            ` : `
              <div class="card-table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th style="text-align:right;">Total</th>
                      <th style="text-align:right;">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${clientOrders.map(o => `
                      <tr>
                        <td><strong>#${String(o.id).padStart(4, '0')}</strong></td>
                        <td><span class="badge ${o.status === 'Delivered' ? 'badge-delivered' : o.status === 'In Production' ? 'badge-production' : 'badge-pending'}">${o.status}</span></td>
                        <td>${(o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Custom item'}</td>
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
            <button type="button" class="btn btn-outline" id="btn-close">Close</button>
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
