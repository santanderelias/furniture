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
      console.error('Error al cargar pedidos:', err);
      container.innerHTML = `<div class="error-msg">Error al cargar pedidos: ${err.message}</div>`;
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
          <span>Pedidos y cotizaciones</span>
          <span class="section-count">(${filtered.length} pedidos)</span>
        </div>
        <div>
          <button id="btn-add-order" class="btn btn-primary">
            Nuevo pedido
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" id="order-search" class="search-input" placeholder="Buscar por cliente o n.º de pedido..." value="${escapeHtml(searchTerm)}" />
        <div class="filter-pills">
          ${[
            { id: 'All', label: 'Todos' },
            { id: 'Pending', label: 'Pendientes' },
            { id: 'In Production', label: 'En fabricación' },
            { id: 'Delivered', label: 'Entregados' }
          ].map(f => `
            <button class="filter-pill ${activeFilter === f.id ? 'active' : ''}" data-status="${f.id}">
              ${f.label}
            </button>
          `).join('')}
        </div>
      </div>

      ${filtered.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">No se encontraron pedidos</div>
          <div style="font-size: 0.85rem;">Creá un nuevo pedido o cotización para comenzar.</div>
        </div>
      ` : `
        <div class="card-table-wrapper">
          <table class="data-table orders-table">
            <thead>
              <tr>
                <th>N.º pedido</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Anticipo</th>
                <th>Saldo</th>
                <th style="text-align:center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(order => {
                const itemsPreview = (order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Mueble personalizado';
                const balance = Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0));

                return `
                  <tr class="clickable-row order-main-row" data-id="${order.id}" tabindex="0" aria-label="Editar pedido ${order.id}">
                    <td data-label="N.º pedido"><strong>#${String(order.id).padStart(4, '0')}</strong></td>
                    <td data-label="Cliente">
                      <div class="row-title">${escapeHtml(order.client_name || 'Cliente de mostrador')}</div>
                      <div class="row-subtitle">${escapeHtml(order.client_phone || '')}</div>
                    </td>
                    <td data-label="Estado">
                      <select class="form-control status-select" data-id="${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="In Production" ${order.status === 'In Production' ? 'selected' : ''}>En fabricación</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Entregado</option>
                      </select>
                    </td>
                    <td data-label="Total" class="num-cell"><strong>$${Number(order.total_amount).toFixed(2)}</strong></td>
                    <td data-label="Anticipo" class="num-cell text-success">$${Number(order.deposit_amount).toFixed(2)}</td>
                    <td data-label="Saldo" class="num-cell ${balance > 0 ? 'text-warning' : 'text-success'}">
                      <strong>$${balance.toFixed(2)}</strong>
                    </td>
                    <td data-label="Acciones" class="actions-cell">
                      <div class="action-buttons">
                        <button class="btn btn-outline btn-sm btn-pdf" data-id="${order.id}" title="Recibo PDF">Recibo PDF</button>
                        <button class="btn btn-outline btn-sm btn-edit" data-id="${order.id}">Editar</button>
                        <button class="btn btn-outline btn-sm btn-delete" data-id="${order.id}" style="color:var(--danger);">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  <tr class="order-sub-row" data-id="${order.id}">
                    <td colspan="7">
                      <div class="sub-row-content">
                        <span class="sub-row-label">Detalle:</span> ${escapeHtml(itemsPreview)}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
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

    container.querySelectorAll('.clickable-row').forEach(item => {
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
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        const id = sel.dataset.id;
        const newStatus = sel.value;
        try {
          await dataService.updateOrderStatus(id, newStatus);
          window.showToast?.(`Pedido #${id} actualizado`);
          loadData();
          if (onRefresh) onRefresh();
        } catch (err) {
          alert('Error al actualizar estado: ' + err.message);
        }
      });
    });

    container.querySelectorAll('.btn-pdf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const order = orders.find(o => o.id === id);
        if (order) showOrderModal(order);
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        if (confirm(`¿Estás seguro de que querés eliminar el pedido #${id}?`)) {
          try {
            await dataService.deleteOrder(id);
            window.showToast?.(`Pedido #${id} eliminado`);
            loadData();
            if (onRefresh) onRefresh();
          } catch (err) {
            alert('Error al eliminar el pedido: ' + err.message);
          }
        }
      });
    });
  };

  const showOrderModal = (existingOrder = null) => {
    let orderItems = existingOrder ? [...(existingOrder.items || [])] : [];
    if (orderItems.length === 0) {
      orderItems.push({
        product_name: products[0]?.name || 'Mesa de comedor de roble (6 personas)',
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
            <div class="modal-title">${existingOrder ? `Editar pedido #${existingOrder.id}` : 'Crear nuevo pedido'}</div>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="order-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Cliente *</label>
                  <select id="order-client" class="form-control" required>
                    <option value="">-- Seleccionar cliente --</option>
                    ${clients.map(c => `
                      <option value="${c.id}" ${existingOrder && Number(existingOrder.client_id) === Number(c.id) ? 'selected' : ''}>
                        ${escapeHtml(c.name)} (${escapeHtml(c.phone || 'Sin teléfono')})
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Estado de fabricación</label>
                  <select id="order-status" class="form-control">
                    <option value="Pending" ${existingOrder?.status === 'Pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="In Production" ${existingOrder?.status === 'In Production' ? 'selected' : ''}>En fabricación</option>
                    <option value="Delivered" ${existingOrder?.status === 'Delivered' ? 'selected' : ''}>Entregado</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <label class="form-label" style="margin-bottom:0;">Artículos del pedido *</label>
                  <button type="button" id="btn-add-item" class="btn btn-outline btn-sm">Agregar artículo</button>
                </div>

                <div class="order-items-builder" id="items-container">
                  <!-- Se renderiza dinámicamente -->
                </div>
              </div>

              <div class="form-row" style="background:var(--bg-subtle); padding:0.75rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Monto total ($)</label>
                  <input type="number" step="0.01" id="order-total" class="form-control" value="${totalAmount.toFixed(2)}" readonly style="font-weight:700; font-size:1.1rem; background:var(--bg-main);" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Anticipo pagado ($)</label>
                  <input type="number" step="0.01" id="order-deposit" class="form-control" value="${depositAmount.toFixed(2)}" required style="font-weight:700; font-size:1.1rem; color:var(--success);" />
                  <div style="display:flex; gap:0.25rem; margin-top:0.35rem;">
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.3">30%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.5">50%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="1.0">100% (Total)</button>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Saldo pendiente</label>
                  <div id="order-balance" style="font-weight:700; font-size:1.15rem; color:#b45309; padding-top:0.4rem;">
                    $${Math.max(0, totalAmount - depositAmount).toFixed(2)}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-order">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-save-order">
              ${existingOrder ? 'Guardar cambios' : 'Crear pedido'}
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
            <input type="text" class="form-control item-name" list="products-datalist" value="${escapeHtml(item.product_name)}" placeholder="Nombre del artículo o buscar producto..." />
            <datalist id="products-datalist">
              ${products.map(p => `<option value="${escapeHtml(p.name)}">$${p.price.toFixed(2)} (${p.category})</option>`).join('')}
            </datalist>
          </div>
          <div>
            <input type="number" min="1" class="form-control item-qty" value="${item.quantity}" placeholder="Cant." />
          </div>
          <div>
            <input type="number" step="0.01" class="form-control item-price" value="${item.unit_price}" placeholder="Precio" />
          </div>
          <div style="font-weight:600; text-align:right;">
            $${(Number(item.subtotal) || 0).toFixed(2)}
          </div>
          <div>
            <button type="button" class="btn btn-outline btn-sm item-remove" style="color:var(--danger); padding:0.25rem 0.5rem;" ${orderItems.length <= 1 ? 'disabled' : ''}>&times;</button>
          </div>
        </div>
      `).join('');
      i18nService.apply(itemsContainer);

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
        product_name: 'Mueble artesanal',
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
        alert('Por favor elegí un cliente.');
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
        window.showToast?.(existingOrder ? 'Pedido actualizado' : 'Nuevo pedido creado');
        closeModal();
        loadData();
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Error al guardar el pedido: ' + err.message);
      }
    });
  };

  const showPdfReceiptModal = (order, client, pdfDoc) => {
    const modalHtml = `
      <div class="modal-overlay" id="pdf-modal">
        <div class="modal-content" style="max-width: 550px;">
          <div class="modal-header">
            <div class="modal-title">Factura y recibo REC-${String(order.id).padStart(5, '0')}</div>
            <button class="modal-close" id="close-pdf-modal">&times;</button>
          </div>
          <div class="modal-body" style="text-align: center; padding: 2rem 1.5rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--text-main);">Recibo listo para ver o descargar</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
              Cliente: <strong>${escapeHtml(client?.name || order.client_name || 'Cliente de mostrador')}</strong><br/>
              Total: <strong>$${Number(order.total_amount).toFixed(2)}</strong> | Anticipo: <strong>$${Number(order.deposit_amount).toFixed(2)}</strong> | Saldo: <strong>$${Math.max(0, Number(order.total_amount) - Number(order.deposit_amount)).toFixed(2)}</strong>
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button id="btn-view-pdf" class="btn btn-outline">
                Ver PDF
              </button>
              <button id="btn-download-pdf" class="btn btn-primary">
                Descargar PDF
              </button>
              <button id="btn-print-pdf" class="btn btn-outline">
                Imprimir
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-close-pdf">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml;
    document.body.appendChild(wrapper);
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
      runPdfAction(event.currentTarget, () => pdfDoc.download(), 'Factura guardada en Descargas');
    });
    wrapper.querySelector('#btn-print-pdf').addEventListener('click', event => {
      runPdfAction(event.currentTarget, () => pdfDoc.print(), 'Se abrió el diálogo de impresión');
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
