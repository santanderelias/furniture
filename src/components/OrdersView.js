import { dataService } from '../services/dataService.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { i18nService } from '../services/i18nService.js';

export function renderOrdersView(container, { onRefresh, openNewOrder = false, openOrderId = null } = {}) {
  let orders = [];
  let clients = [];
  let products = [];
  let activeFilter = 'All';
  let searchTerm = '';

  const loadData = async () => {
    try {
      [orders, clients, products] = await Promise.all([
        dataService.getOrders(),
        dataService.getClients(),
        dataService.getProducts()
      ]);
      render();
      if (openOrderId !== null && openOrderId !== undefined) {
        const orderToEdit = orders.find(order => Number(order.id) === Number(openOrderId));
        if (orderToEdit) showOrderModal(orderToEdit);
        openOrderId = null;
      } else if (openNewOrder) {
        showOrderModal();
        openNewOrder = false;
      }
    } catch (err) {
      console.error('Error loading orders data:', err);
      container.innerHTML = `<div class="error-msg">Failed to load orders: ${err.message}</div>`;
    }
  };

  const render = () => {
    const filtered = orders.filter(o => {
      const matchFilter = activeFilter === 'All' || o.status === activeFilter;
      const clientName = (o.client_name || '').toLowerCase();
      const orderId = String(o.id || '');
      const matchSearch = !searchTerm || clientName.includes(searchTerm.toLowerCase()) || orderId.includes(searchTerm);
      return matchFilter && matchSearch;
    });

    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>📦 Orders & Custom Woodwork Quotes</span>
          <span style="font-size:0.85rem; color:var(--text-muted); font-weight:normal;">(${filtered.length} orders)</span>
        </div>
        <div>
          <button id="btn-add-order" class="btn btn-primary">
            ➕ New Order / Quote
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="order-search" class="search-input" placeholder="Search by client or order #..." value="${escapeHtml(searchTerm)}" />
        <div class="filter-pills">
          ${['All', 'Pending', 'In Production', 'Delivered'].map(status => `
            <button class="filter-pill ${activeFilter === status ? 'active' : ''}" data-status="${status}">
              ${status}
            </button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No orders found</div>
          <div style="font-size: 0.85rem;">Create a new furniture order or quote to get started.</div>
        </div>
      ` : `
        <div class="card-table-wrapper desktop-order-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Client</th>
                <th>Status</th>
                <th>Items</th>
                <th style="text-align:right;">Total</th>
                <th style="text-align:right;">Deposit</th>
                <th style="text-align:right;">Balance</th>
                <th style="text-align:center;">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(order => {
                const badgeClass = order.status === 'Delivered' ? 'badge-delivered' : order.status === 'In Production' ? 'badge-production' : 'badge-pending';
                const itemsCount = (order.items || []).length;
                const itemsPreview = (order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Custom item';
                const balance = Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0));

                return `
                  <tr class="clickable-row" data-id="${order.id}" tabindex="0" aria-label="Edit order ${order.id}">
                    <td><strong>#${String(order.id).padStart(4, '0')}</strong></td>
                    <td>
                      <div style="font-weight:600; color:var(--text-main);">${escapeHtml(order.client_name || 'Walk-in Client')}</div>
                      <div style="font-size:0.775rem; color:var(--text-muted);">${escapeHtml(order.client_phone || '')}</div>
                    </td>
                    <td>
                      <select class="form-control status-select" data-id="${order.id}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.775rem; font-weight: 600;">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="In Production" ${order.status === 'In Production' ? 'selected' : ''}>🔨 In Production</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✔ Delivered</option>
                      </select>
                    </td>
                    <td style="max-width: 200px;">
                      <div style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(itemsPreview)}">
                        ${escapeHtml(itemsPreview)}
                      </div>
                      <div style="font-size:0.725rem; color:var(--text-muted);">${itemsCount} item(s)</div>
                    </td>
                    <td style="text-align:right; font-weight:700;">$${Number(order.total_amount).toFixed(2)}</td>
                    <td style="text-align:right; color:#059669; font-weight:600;">$${Number(order.deposit_amount).toFixed(2)}</td>
                    <td style="text-align:right; font-weight:700; color:${balance > 0 ? '#b45309' : '#059669'};">
                      $${balance.toFixed(2)}
                    </td>
                    <td style="text-align:center;">
                      <div style="display:inline-flex; gap:0.35rem; align-items:center;">
                        <button class="btn btn-outline btn-sm btn-pdf" data-id="${order.id}" title="Generate PDF Receipt">
                          🧾 PDF Receipt
                        </button>
                        <button class="btn btn-outline btn-sm btn-edit" data-id="${order.id}" title="Edit Order">
                          ✏
                        </button>
                        <button class="btn btn-outline btn-sm btn-delete" data-id="${order.id}" title="Delete" style="color:var(--danger);">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="mobile-order-cards">
          ${filtered.map(order => {
            const itemsPreview = (order.items || []).map(item => `${item.quantity}× ${item.product_name}`).join(', ') || 'Custom item';
            const balance = Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0));
            const badgeClass = order.status === 'Delivered' ? 'badge-delivered' : order.status === 'In Production' ? 'badge-production' : 'badge-pending';
            return `
              <article class="order-card" data-id="${order.id}" tabindex="0" aria-label="Edit order ${order.id}">
                <div class="order-card-header">
                  <div class="order-card-title">Order #${String(order.id).padStart(4, '0')}</div>
                  <span class="badge ${badgeClass}">${escapeHtml(order.status || 'Pending')}</span>
                </div>
                <div class="order-card-client">${escapeHtml(order.client_name || 'Walk-in Client')}</div>
                <div class="item-card-meta">${escapeHtml(order.client_phone || '')}</div>
                <div class="order-card-items">${escapeHtml(itemsPreview)}</div>
                <div class="order-card-finances">
                  <div><span class="item-card-meta">Total</span><br><strong>$${Number(order.total_amount).toFixed(2)}</strong></div>
                  <div><span class="item-card-meta">Deposit</span><br><strong>$${Number(order.deposit_amount).toFixed(2)}</strong></div>
                  <div><span class="item-card-meta">Balance</span><br><strong>$${balance.toFixed(2)}</strong></div>
                </div>
                <label class="form-label" for="mobile-status-${order.id}">Production status</label>
                <select id="mobile-status-${order.id}" class="form-control status-select order-card-status" data-id="${order.id}">
                  <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="In Production" ${order.status === 'In Production' ? 'selected' : ''}>🔨 In Production</option>
                  <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✔ Delivered</option>
                </select>
                <div class="order-card-actions">
                  <button class="btn btn-outline btn-sm btn-pdf" data-id="${order.id}">🧾 PDF</button>
                  <button class="btn btn-outline btn-sm btn-edit" data-id="${order.id}">✏ Edit</button>
                  <button class="btn btn-outline btn-sm btn-delete" data-id="${order.id}" style="color:var(--danger);">🗑 Delete</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Event listeners
    container.querySelector('#btn-add-order')?.addEventListener('click', () => showOrderModal());

    const searchInput = container.querySelector('#order-search');
    searchInput?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      render();
      const el = container.querySelector('#order-search');
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });

    container.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.status;
        render();
      });
    });

    container.querySelectorAll('.clickable-row, .order-card').forEach(item => {
      const openForEdit = (event) => {
        if (event.target.closest('button, select, a')) return;
        const order = orders.find(candidate => Number(candidate.id) === Number(item.dataset.id));
        if (order) showOrderModal(order);
      };
      item.addEventListener('click', openForEdit);
      item.addEventListener('keydown', (event) => {
        if (event.target !== item) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openForEdit(event);
        }
      });
    });

    container.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        const newStatus = sel.value;
        try {
          await dataService.updateOrderStatus(id, newStatus);
          window.showToast?.(`Order #${id} marked as ${newStatus}`);
          loadData();
          if (onRefresh) onRefresh();
        } catch (err) {
          alert('Failed to update status: ' + err.message);
        }
      });
    });

    container.querySelectorAll('.btn-pdf').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const order = orders.find(o => Number(o.id) === id);
        if (order) {
          const client = clients.find(c => Number(c.id) === Number(order.client_id)) || {};
          try {
            const pdfDoc = generatePdfReceipt(order, client);
            showPdfReceiptModal(order, client, pdfDoc);
          } catch (err) {
            alert('No se pudo preparar el PDF: ' + err.message);
          }
        }
      });
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const order = orders.find(o => o.id === id);
        if (order) showOrderModal(order);
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        if (confirm(`Are you sure you want to delete Order #${id}?`)) {
          try {
            await dataService.deleteOrder(id);
            window.showToast?.(`Order #${id} deleted`);
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Failed to delete order: ' + err.message);
          }
        }
      });
    });
  };

  const showOrderModal = (existingOrder = null) => {
    let orderItems = existingOrder ? [...(existingOrder.items || [])] : [];
    if (orderItems.length === 0) {
      orderItems.push({
        product_name: products[0]?.name || 'Solid Oak Dining Table (6-Seater)',
        quantity: 1,
        unit_price: products[0]?.price || 850,
        subtotal: products[0]?.price || 850
      });
    }

    const calcTotal = () => {
      return orderItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    };

    let totalAmount = existingOrder ? Number(existingOrder.total_amount) : calcTotal();
    let depositAmount = existingOrder ? Number(existingOrder.deposit_amount) : (totalAmount * 0.5);

    const modalHtml = `
      <div class="modal-overlay" id="order-modal">
        <div class="modal-content" style="max-width: 650px;">
          <div class="modal-header">
            <div class="modal-title">${existingOrder ? `Edit Order #${existingOrder.id}` : 'Create New Furniture Order'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="order-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Client *</label>
                  <select id="order-client" class="form-control" required>
                    <option value="">-- Select Client --</option>
                    ${clients.map(c => `
                      <option value="${c.id}" ${existingOrder && Number(existingOrder.client_id) === Number(c.id) ? 'selected' : ''}>
                        ${escapeHtml(c.name)} (${escapeHtml(c.phone || 'No phone')})
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Production Status</label>
                  <select id="order-status" class="form-control">
                    <option value="Pending" ${existingOrder?.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="In Production" ${existingOrder?.status === 'In Production' ? 'selected' : ''}>In Production</option>
                    <option value="Delivered" ${existingOrder?.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <label class="form-label" style="margin-bottom:0;">Order Line Items *</label>
                  <button type="button" id="btn-add-item" class="btn btn-outline btn-sm">➕ Add Product / Line Item</button>
                </div>

                <div class="order-items-builder" id="items-container">
                  <!-- Rendered dynamically -->
                </div>
              </div>

              <div class="form-row" style="background:#f8fafc; padding:0.75rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Total Amount ($)</label>
                  <input type="number" step="0.01" id="order-total" class="form-control" value="${totalAmount.toFixed(2)}" readonly style="font-weight:700; font-size:1.1rem; background:#f1f5f9;" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Deposit Paid ($)</label>
                  <input type="number" step="0.01" id="order-deposit" class="form-control" value="${depositAmount.toFixed(2)}" required style="font-weight:700; font-size:1.1rem; color:#059669;" />
                  <div style="display:flex; gap:0.25rem; margin-top:0.35rem;">
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.3">30%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.5">50%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="1.0">100% (Full)</button>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Remaining Balance</label>
                  <div id="order-balance" style="font-weight:700; font-size:1.15rem; color:#b45309; padding-top:0.4rem;">
                    $${Math.max(0, totalAmount - depositAmount).toFixed(2)}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-order">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save-order">
              💾 ${existingOrder ? 'Save Changes' : 'Create Order & Invoice'}
            </button>
          </div>
        </div>
      </div>
    `;

    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = modalHtml;
    document.body.appendChild(modalWrapper);
    i18nService.apply(modalWrapper);

    const modalEl = document.getElementById('order-modal');
    const itemsContainer = document.getElementById('items-container');
    const totalInput = document.getElementById('order-total');
    const depositInput = document.getElementById('order-deposit');
    const balanceDisplay = document.getElementById('order-balance');

    const updateCalculations = () => {
      let t = 0;
      orderItems.forEach(item => {
        item.subtotal = (Number(item.quantity) || 1) * (Number(item.unit_price) || 0);
        t += item.subtotal;
      });
      totalAmount = t;
      totalInput.value = totalAmount.toFixed(2);
      let dep = Number(depositInput.value) || 0;
      let bal = Math.max(0, totalAmount - dep);
      balanceDisplay.textContent = `$${bal.toFixed(2)}`;
    };

    const renderItemsList = () => {
      itemsContainer.innerHTML = orderItems.map((item, idx) => `
        <div class="order-item-row" data-idx="${idx}">
          <div>
            <input type="text" class="form-control item-name" list="products-datalist" value="${escapeHtml(item.product_name)}" placeholder="Item name or select product..." />
            <datalist id="products-datalist">
              ${products.map(p => `<option value="${escapeHtml(p.name)}">$${p.price.toFixed(2)} (${p.category})</option>`).join('')}
            </datalist>
          </div>
          <div>
            <input type="number" min="1" class="form-control item-qty" value="${item.quantity}" placeholder="Qty" />
          </div>
          <div>
            <input type="number" step="0.01" class="form-control item-price" value="${item.unit_price}" placeholder="Price" />
          </div>
          <div style="font-weight:600; text-align:right;">
            $${(Number(item.subtotal) || 0).toFixed(2)}
          </div>
          <div>
            <button type="button" class="btn btn-outline btn-sm item-remove" style="color:var(--danger); padding:0.25rem 0.5rem;" ${orderItems.length <= 1 ? 'disabled' : ''}>✕</button>
          </div>
        </div>
      `).join('');
      i18nService.apply(itemsContainer);

      // Wire item inputs
      itemsContainer.querySelectorAll('.order-item-row').forEach(row => {
        const idx = Number(row.dataset.idx);
        const nameInp = row.querySelector('.item-name');
        const qtyInp = row.querySelector('.item-qty');
        const priceInp = row.querySelector('.item-price');
        const removeBtn = row.querySelector('.item-remove');

        nameInp.addEventListener('change', () => {
          orderItems[idx].product_name = nameInp.value;
          const match = products.find(p => p.name.toLowerCase() === nameInp.value.toLowerCase());
          if (match) {
            orderItems[idx].unit_price = match.price;
            priceInp.value = match.price;
          }
          updateCalculations();
          renderItemsList();
        });

        qtyInp.addEventListener('input', () => {
          orderItems[idx].quantity = Number(qtyInp.value) || 1;
          updateCalculations();
          renderItemsList();
        });

        priceInp.addEventListener('input', () => {
          orderItems[idx].unit_price = Number(priceInp.value) || 0;
          updateCalculations();
          renderItemsList();
        });

        removeBtn.addEventListener('click', () => {
          if (orderItems.length > 1) {
            orderItems.splice(idx, 1);
            updateCalculations();
            renderItemsList();
          }
        });
      });
    };

    renderItemsList();

    document.getElementById('btn-add-item').addEventListener('click', () => {
      orderItems.push({
        product_name: 'Handcrafted Piece',
        quantity: 1,
        unit_price: 250,
        subtotal: 250
      });
      updateCalculations();
      renderItemsList();
    });

    depositInput.addEventListener('input', updateCalculations);

    modalEl.querySelectorAll('.deposit-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = Number(btn.dataset.pct);
        depositInput.value = (totalAmount * pct).toFixed(2);
        updateCalculations();
      });
    });

    const closeModal = () => modalWrapper.remove();
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-order').addEventListener('click', closeModal);

    document.getElementById('btn-save-order').addEventListener('click', async () => {
      const clientId = document.getElementById('order-client').value;
      if (!clientId) {
        alert('Please select a client.');
        return;
      }

      const status = document.getElementById('order-status').value;
      const depositVal = Number(depositInput.value) || 0;

      const orderPayload = {
        id: existingOrder?.id,
        client_id: Number(clientId),
        status,
        total_amount: totalAmount,
        deposit_amount: depositVal,
        items: orderItems
      };

      try {
        await dataService.saveOrder(orderPayload);
        window.showToast?.(existingOrder ? 'Order updated successfully' : 'New order created');
        closeModal();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Error saving order: ' + err.message);
      }
    });
  };

  const showPdfReceiptModal = (order, client, pdfDoc) => {
    const modalHtml = `
      <div class="modal-overlay" id="pdf-modal">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <div class="modal-title">🧾 Invoice & Receipt: REC-${String(order.id).padStart(5, '0')}</div>
            <button class="modal-close" id="close-pdf-modal">&times;</button>
          </div>
          <div class="modal-body" style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
            <h3 style="margin-bottom: 0.5rem; color: var(--text-main);">Official Furniture Receipt Ready</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
              Client: <strong>${escapeHtml(client?.name || order.client_name || 'Walk-in Client')}</strong><br/>
              Total: <strong>$${Number(order.total_amount).toFixed(2)}</strong> | Deposit: <strong>$${Number(order.deposit_amount).toFixed(2)}</strong> | Balance Due: <strong>$${Math.max(0, Number(order.total_amount) - Number(order.deposit_amount)).toFixed(2)}</strong>
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button id="btn-view-pdf" class="btn btn-outline" style="padding: 0.75rem 1.5rem;">
                👁 Ver PDF
              </button>
              <button id="btn-download-pdf" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">
                📥 Descargar PDF
              </button>
              <button id="btn-print-pdf" class="btn btn-outline" style="padding: 0.75rem 1.5rem;">
                🖨 Imprimir
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-close-pdf">Done</button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
    i18nService.apply(wrapper);
    i18nService.apply(wrapper);

    const close = () => wrapper.remove();
    document.getElementById('close-pdf-modal').addEventListener('click', close);
    document.getElementById('btn-close-pdf').addEventListener('click', close);

    const runPdfAction = async (button, action, successMessage) => {
      button.disabled = true;
      try {
        await action();
        window.showToast?.(successMessage);
      } catch (err) {
        alert(err.message || 'No se pudo procesar el PDF.');
      } finally {
        button.disabled = false;
      }
    };

    wrapper.querySelector('#btn-view-pdf').addEventListener('click', event => {
      runPdfAction(event.currentTarget, () => pdfDoc.open(), 'Abriendo la factura PDF...');
    });
    wrapper.querySelector('#btn-download-pdf').addEventListener('click', event => {
      runPdfAction(event.currentTarget, () => pdfDoc.download(), 'Factura guardada en Descargas.');
    });

    wrapper.querySelector('#btn-print-pdf').addEventListener('click', event => {
      runPdfAction(event.currentTarget, () => pdfDoc.print(), 'Se abrió el diálogo de impresión.');
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
