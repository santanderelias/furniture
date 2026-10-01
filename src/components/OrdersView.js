import { dataService } from '../services/dataService.js';
import { generatePdfDeliveryReceipt, generatePdfReceipt } from '../services/pdfService.js';
import { i18nService } from '../services/i18nService.js';
import { formatDate, formatMoney, localDateInputValue, sortOrders } from '../services/formatService.js';
import { recordRevision, showRecordHistory } from '../services/recordHistoryService.js';

export function renderOrdersView(container, { onRefresh, openNewOrder = false, openOrderId = null, clientId = null } = {}) {
  let orders = [];
  let clients = [];
  let products = [];
  let activeFilter = 'All';
  let searchTerm = '';
  let sortMode = 'added';
  let hiddenStatuses = new Set(['Delivered']);
  let orderFilterOpen = false;

  bindStatusMenuDismissal(container);

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
        showOrderModal(null, clientId);
        openNewOrder = false;
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      container.innerHTML = `<div class="error-msg">Error al cargar pedidos: ${err.message}</div>`;
    }
  };

  const render = () => {
    const filtered = sortOrders(orders, sortMode).filter(o => {
      const matchFilter = activeFilter === 'All' || o.status === activeFilter;
      const isVisible = !hiddenStatuses.has(o.status);
      const clientName = (o.client_name || '').toLowerCase();
      const orderId = String(o.id || '');
      const matchSearch = !searchTerm || clientName.includes(searchTerm.toLowerCase()) || orderId.includes(searchTerm);
      return matchFilter && isVisible && matchSearch;
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
        <div class="order-filter-control">
          <button type="button" id="btn-order-filter" class="btn btn-outline" aria-expanded="${orderFilterOpen}">Filtros</button>
          <div class="order-filter-menu" ${orderFilterOpen ? '' : 'hidden'}>
            <strong>Ocultar pedidos</strong>
            ${[
              { id: 'Pending', label: 'Pendientes' },
              { id: 'In Production', label: 'En fabricación' },
              { id: 'Delivered', label: 'Entregados / completados' }
            ].map(status => `
              <label><input type="checkbox" data-hide-status="${status.id}" ${hiddenStatuses.has(status.id) ? 'checked' : ''} />${status.label}</label>
            `).join('')}
          </div>
        </div>
        <label class="order-sort-control">
          <span>Ordenar por</span>
          <select id="order-sort" class="form-control">
            <option value="added" ${sortMode === 'added' ? 'selected' : ''}>Últimos agregados</option>
            <option value="edited" ${sortMode === 'edited' ? 'selected' : ''}>Últimos editados</option>
            <option value="name" ${sortMode === 'name' ? 'selected' : ''}>Nombre (A-Z)</option>
            <option value="address" ${sortMode === 'address' ? 'selected' : ''}>Dirección (A-Z)</option>
          </select>
        </label>
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
        <div class="order-card-list">
          ${filtered.map(order => {
            const itemsPreview = (order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Mueble personalizado';
            const balance = Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0));

            return `
              <article class="order-card clickable-row" data-id="${order.id}" tabindex="0" aria-label="${i18nService.getLanguage() === 'en' ? `Edit order #${order.id}` : `Editar pedido #${order.id}`}">
                <div class="order-card-heading">
                  <div>
                    <div class="order-card-number">#${String(order.id).padStart(4, '0')}</div>
                    <div class="row-title">${escapeHtml(order.client_name || 'Cliente de mostrador')}</div>
                    <div class="row-subtitle">${escapeHtml(order.client_phone || '')}</div>
                    ${order.client_address ? `<div class="row-subtitle order-card-address">${escapeHtml(order.client_address)}</div>` : ''}
                  </div>
                  <div class="status-picker">
                    <button type="button" class="status-pill badge ${statusClass(order.status)}" data-id="${order.id}" aria-expanded="false">
                      ${statusLabel(order.status)}
                    </button>
                    <div class="status-menu" hidden>
                      ${statusOptions().map(option => `<button type="button" class="status-option" data-status="${option.value}">${option.label}</button>`).join('')}
                    </div>
                  </div>
                </div>
                <div class="order-card-dates">
                  <div><span>Fecha del pedido</span><time>${formatDate(order.created_at)}</time></div>
                  <div><span>Fecha de entrega</span><time>${formatDate(order.delivery_date)}</time></div>
                </div>
                <div class="order-card-totals">
                  <div><span>Total</span><strong>${formatMoney(order.total_amount)}</strong></div>
                  <div><span>Anticipo</span><strong class="text-success">${formatMoney(order.deposit_amount)}</strong></div>
                  <div><span>Saldo</span><strong class="${balance > 0 ? 'text-warning' : 'text-success'}">${formatMoney(balance)}</strong></div>
                </div>
                <div class="order-card-items"><strong>Detalle:</strong><span>${escapeHtml(itemsPreview)}</span></div>
                <div class="action-buttons order-card-actions">
                  <button class="btn btn-outline btn-sm btn-pdf" data-id="${order.id}" title="Recibo PDF">Recibo PDF</button>
                  <button class="btn btn-outline btn-sm btn-delivery-note" data-id="${order.id}">Remito transporte</button>
                  <button class="btn btn-outline btn-sm btn-edit" data-id="${order.id}">Editar</button>
                  <button class="btn btn-outline btn-sm btn-delete" data-id="${order.id}" style="color:var(--danger);">Eliminar</button>
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
    container.querySelector('#order-sort')?.addEventListener('change', event => {
      sortMode = event.currentTarget.value;
      render();
    });

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
        if (activeFilter !== 'All') hiddenStatuses.delete(activeFilter);
        render();
      });
    });

    container.querySelector('#btn-order-filter')?.addEventListener('click', event => {
      event.stopPropagation();
      orderFilterOpen = !orderFilterOpen;
      render();
    });
    container.querySelectorAll('[data-hide-status]').forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) hiddenStatuses.add(input.dataset.hideStatus);
        else hiddenStatuses.delete(input.dataset.hideStatus);
        orderFilterOpen = true;
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

    container.querySelectorAll('.status-pill').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const menu = button.nextElementSibling;
        const willOpen = menu.hidden;
        container.querySelectorAll('.status-menu').forEach(otherMenu => { otherMenu.hidden = true; });
        container.querySelectorAll('.status-pill').forEach(otherButton => otherButton.setAttribute('aria-expanded', 'false'));
        menu.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
      });
    });

    container.querySelectorAll('.status-option').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const picker = button.closest('.status-picker');
        const pill = picker.querySelector('.status-pill');
        const order = orders.find(candidate => Number(candidate.id) === Number(pill.dataset.id));
        const newStatus = button.dataset.status;
        if (!order || order.status === newStatus) return;
        try {
          await dataService.updateOrderStatus(order.id, newStatus);
          await recordRevision('order', order.id, order);
          window.showToast?.(`Pedido #${order.id} actualizado`);
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

    container.querySelectorAll('.btn-delivery-note').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.stopPropagation();
        const order = orders.find(candidate => Number(candidate.id) === Number(btn.dataset.id));
        if (!order) return;
        const client = clients.find(candidate => Number(candidate.id) === Number(order.client_id)) || {};
        btn.disabled = true;
        try {
          await generatePdfDeliveryReceipt(order, client).download();
          window.showToast?.('Remito de transporte descargado');
        } catch (error) {
          alert(error.message || 'No se pudo preparar el remito de transporte.');
        } finally {
          btn.disabled = false;
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

  const showOrderModal = (existingOrder = null, initialClientId = null) => {
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
            <div class="modal-header-actions">
              ${existingOrder ? '<button type="button" class="btn btn-outline btn-sm" id="btn-order-history">Historial</button>' : ''}
              <button class="modal-close" id="close-modal">&times;</button>
            </div>
          </div>
          <div class="modal-body">
            <form id="order-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Cliente *</label>
                  <select id="order-client" class="form-control" required>
                    <option value="" ${!existingOrder && !initialClientId ? 'selected' : ''}>-- Seleccionar cliente --</option>
                    <option value="__new_client__">+ Agregar nuevo cliente</option>
                    ${clients.map(c => `
                        <option value="${c.id}" ${(existingOrder && Number(existingOrder.client_id) === Number(c.id)) || (!existingOrder && Number(initialClientId) === Number(c.id)) ? 'selected' : ''}>
                        ${escapeHtml(c.name)} (${escapeHtml(c.phone || 'Sin teléfono')})${c.address ? ` - ${escapeHtml(c.address)}` : ''}
                      </option>
                    `).join('')}
                  </select>
                  <div class="inline-client-form" id="inline-new-client" hidden>
                    <strong>Nuevo cliente</strong>
                    <input type="text" id="inline-client-name" class="form-control" placeholder="Nombre completo *" required />
                    <input type="tel" id="inline-client-phone" class="form-control" placeholder="Teléfono de contacto" />
                    <input type="text" id="inline-client-address" class="form-control" placeholder="Dirección de entrega" />
                    <div class="inline-client-actions">
                      <button type="button" id="inline-client-cancel" class="btn btn-outline btn-sm">Cancelar</button>
                      <button type="button" id="inline-client-save" class="btn btn-primary btn-sm">Guardar cliente</button>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Estado de fabricación</label>
                  <input type="hidden" id="order-status" value="${existingOrder?.status || 'Pending'}" />
                  <div class="status-picker status-picker-form">
                    <button type="button" class="status-pill badge ${statusClass(existingOrder?.status || 'Pending')}" id="order-status-button" aria-expanded="false">
                      ${statusLabel(existingOrder?.status || 'Pending')}
                    </button>
                    <div class="status-menu" hidden>
                      ${statusOptions().map(option => `<button type="button" class="status-option" data-status="${option.value}">${option.label}</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <div class="order-client-address">
                <span>Dirección de entrega</span>
                <button type="button" id="order-client-address-display" class="order-client-address-display" aria-label="Editar dirección de entrega">
                  <span id="order-client-address">${escapeHtml(clients.find(client => Number(client.id) === Number(existingOrder?.client_id))?.address || 'Sin dirección especificada')}</span>
                  <span aria-hidden="true">✎</span>
                </button>
                <div id="order-client-address-editor" class="order-client-address-editor" hidden>
                  <input type="text" id="order-client-address-input" class="form-control" />
                  <button type="button" id="order-client-address-save" class="btn btn-primary btn-sm">Guardar dirección</button>
                  <button type="button" id="order-client-address-cancel" class="btn btn-outline btn-sm">Cancelar</button>
                </div>
              </div>

              <div class="form-row order-date-fields">
                <div class="form-group">
                  <label class="form-label" for="order-created-date">Fecha del pedido</label>
                  <input type="date" id="order-created-date" class="form-control" value="${localDateInputValue(existingOrder?.created_at || new Date())}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="order-delivery-date">Fecha de entrega</label>
                  <input type="date" id="order-delivery-date" class="form-control" value="${localDateInputValue(existingOrder?.delivery_date)}" />
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
                  <div id="order-total" class="form-control calculated-money">${formatMoney(totalAmount)}</div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Anticipo pagado ($)</label>
                  <input type="number" step="0.01" id="order-deposit" class="form-control" value="${Math.round(depositAmount)}" required style="font-weight:700; font-size:1.1rem; color:var(--success);" />
                  <div style="display:flex; gap:0.25rem; margin-top:0.35rem;">
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.3">30%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="0.5">50%</button>
                    <button type="button" class="btn btn-outline btn-sm deposit-preset" data-pct="1.0">100% (Total)</button>
                  </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Saldo pendiente</label>
                  <div id="order-balance" style="font-weight:700; font-size:1.15rem; color:#b45309; padding-top:0.4rem;">
                    ${formatMoney(Math.max(0, totalAmount - depositAmount))}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btn-cancel-order">Cancelar</button>
            <button type="button" class="btn btn-outline" id="btn-delivery-note">Remito transporte</button>
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
    const clientSelect = modalEl.querySelector('#order-client');
    const clientAddress = modalEl.querySelector('#order-client-address');
    const clientAddressDisplay = modalEl.querySelector('#order-client-address-display');
    const clientAddressEditor = modalEl.querySelector('#order-client-address-editor');
    const clientAddressInput = modalEl.querySelector('#order-client-address-input');
    const inlineClientForm = modalEl.querySelector('#inline-new-client');
    let previousClientId = String(existingOrder?.client_id || initialClientId || '');

    const selectedClient = () => clients.find(candidate => Number(candidate.id) === Number(clientSelect.value));
    const refreshClientAddress = () => {
      const client = selectedClient();
      clientAddress.textContent = client?.address || i18nService.text('Sin dirección especificada');
      clientAddressInput.value = client?.address || '';
    };
    refreshClientAddress();

    clientSelect.addEventListener('change', () => {
      if (clientSelect.value === '__new_client__') {
        inlineClientForm.hidden = false;
        modalEl.querySelector('#inline-client-name').focus();
        return;
      }
      inlineClientForm.hidden = true;
      refreshClientAddress();
      previousClientId = clientSelect.value;
    });
    modalEl.querySelector('#inline-client-cancel').addEventListener('click', () => {
      inlineClientForm.hidden = true;
      clientSelect.value = previousClientId;
      refreshClientAddress();
    });
    modalEl.querySelector('#inline-client-save').addEventListener('click', async () => {
      const name = modalEl.querySelector('#inline-client-name').value.trim();
      if (!name) {
        modalEl.querySelector('#inline-client-name').focus();
        return;
      }
      const newClient = {
        name,
        phone: modalEl.querySelector('#inline-client-phone').value.trim(),
        address: modalEl.querySelector('#inline-client-address').value.trim(),
        notes: ''
      };
      const saveButton = modalEl.querySelector('#inline-client-save');
      saveButton.disabled = true;
      try {
        const result = await dataService.saveClient(newClient);
        newClient.id = Number(result.id);
        if (!newClient.id) throw new Error('Could not determine the new client ID.');
        clients.unshift(newClient);
        const option = document.createElement('option');
        option.value = String(newClient.id);
        option.textContent = `${newClient.name} (${newClient.phone || i18nService.text('Sin teléfono')})${newClient.address ? ` - ${newClient.address}` : ''}`;
        clientSelect.append(option);
        clientSelect.value = String(newClient.id);
        inlineClientForm.hidden = true;
        refreshClientAddress();
        window.showToast?.('Cliente registrado');
      } catch (error) {
        alert(error.message || 'Error al guardar cliente.');
      } finally {
        saveButton.disabled = false;
      }
    });
    clientAddressDisplay.addEventListener('click', () => {
      if (!selectedClient()) return;
      clientAddressEditor.hidden = false;
      clientAddressDisplay.hidden = true;
      clientAddressInput.focus();
    });
    modalEl.querySelector('#order-client-address-cancel').addEventListener('click', () => {
      refreshClientAddress();
      clientAddressEditor.hidden = true;
      clientAddressDisplay.hidden = false;
    });
    modalEl.querySelector('#order-client-address-save').addEventListener('click', async event => {
      const client = selectedClient();
      if (!client) return;
      const address = clientAddressInput.value.trim();
      if (address === String(client.address || '').trim()) {
        clientAddressEditor.hidden = true;
        clientAddressDisplay.hidden = false;
        return;
      }
      const saveButton = event.currentTarget;
      saveButton.disabled = true;
      try {
        await dataService.saveClient({ ...client, address });
        await recordRevision('client', client.id, client);
        if (existingOrder && Number(existingOrder.client_id) === Number(client.id)) {
          await recordRevision('order', existingOrder.id, { ...existingOrder, client_address: client.address });
          existingOrder.client_address = address;
        }
        client.address = address;
        orders.forEach(order => {
          if (Number(order.client_id) === Number(client.id)) order.client_address = address;
        });
        refreshClientAddress();
        clientAddressEditor.hidden = true;
        clientAddressDisplay.hidden = false;
        render();
        window.showToast?.('Cliente actualizado');
      } catch (error) {
        alert(error.message || 'Error al guardar la dirección.');
      } finally {
        saveButton.disabled = false;
      }
    });
    const statusButton = modalEl.querySelector('#order-status-button');
    bindStatusMenuDismissal(modalEl);
    modalEl.addEventListener('click', event => {
      if (!event.target.closest('.product-picker')) {
        modalEl.querySelectorAll('.product-suggestions').forEach(menu => { menu.hidden = true; });
      }
    });
    modalEl.addEventListener('focusout', event => {
      const picker = event.target.closest('.product-picker');
      if (picker && !picker.contains(event.relatedTarget)) {
        picker.querySelector('.product-suggestions').hidden = true;
      }
    });
    statusButton.addEventListener('click', () => {
      const menu = statusButton.nextElementSibling;
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      statusButton.setAttribute('aria-expanded', String(willOpen));
    });
    modalEl.querySelectorAll('.status-option').forEach(option => {
      option.addEventListener('click', () => {
        const status = option.dataset.status;
        document.getElementById('order-status').value = status;
        statusButton.textContent = statusLabel(status);
        statusButton.classList.remove('badge-pending', 'badge-production', 'badge-delivered');
        statusButton.classList.add(statusClass(status));
        statusButton.nextElementSibling.hidden = true;
        statusButton.setAttribute('aria-expanded', 'false');
      });
    });

    const updateCalculations = () => {
      let t = 0;
      orderItems.forEach(item => {
        item.subtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        t += item.subtotal;
      });
      totalAmount = t;
      totalInput.textContent = formatMoney(totalAmount);
      let dep = Number(depositInput.value) || 0;
      let bal = Math.max(0, totalAmount - dep);
      balanceDisplay.textContent = formatMoney(bal);
      itemsContainer.querySelectorAll('.order-item-row').forEach(row => {
        const item = orderItems[Number(row.dataset.idx)];
        const subtotal = row.querySelector('.item-subtotal');
        if (item && subtotal) subtotal.textContent = formatMoney(item.subtotal);
      });
    };

    const renderItemsList = () => {
      itemsContainer.innerHTML = orderItems.map((item, idx) => `
        <div class="order-item-row" data-idx="${idx}">
          <div class="product-picker">
            <input type="text" class="form-control item-name" value="${escapeHtml(item.product_name)}" placeholder="Nombre del artículo o buscar producto..." autocomplete="off" aria-haspopup="listbox" aria-expanded="false" />
            <div class="product-suggestions" role="listbox" hidden></div>
          </div>
          <div>
            <input type="number" min="1" class="form-control item-qty" value="${item.quantity}" placeholder="Cant." />
          </div>
          <div>
            <input type="number" step="0.01" class="form-control item-price" value="${item.unit_price}" placeholder="Precio" />
          </div>
          <div class="item-subtotal" style="font-weight:600; text-align:right;">
            ${formatMoney(item.subtotal)}
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
        const suggestions = row.querySelector('.product-suggestions');
        const renderProductSuggestions = () => {
          suggestions.innerHTML = products.length
            ? products.map(product => `
              <button type="button" class="product-suggestion" role="option" data-product-id="${product.id}">
                <span>${escapeHtml(product.name)}</span>
                <small>${formatMoney(product.price)}</small>
              </button>
            `).join('')
            : `<div class="product-suggestions-empty">${i18nService.text('No se encontraron productos')}</div>`;
          suggestions.hidden = false;
          nameInp.setAttribute('aria-expanded', 'true');
        };

        nameInp.addEventListener('focus', () => renderProductSuggestions(nameInp.value));
        nameInp.addEventListener('input', () => {
          orderItems[idx].product_name = nameInp.value;
          renderProductSuggestions();
        });

        suggestions.addEventListener('pointerdown', event => {
          if (event.target.closest('.product-suggestion')) event.preventDefault();
        });
        suggestions.addEventListener('click', event => {
          const option = event.target.closest('.product-suggestion');
          if (!option) return;
          const product = products.find(candidate => String(candidate.id) === option.dataset.productId);
          if (!product) return;
          orderItems[idx].product_name = product.name;
          orderItems[idx].unit_price = product.price;
          nameInp.value = product.name;
          priceInp.value = product.price;
          suggestions.hidden = true;
          nameInp.setAttribute('aria-expanded', 'false');
          updateCalculations();
        });

        nameInp.addEventListener('change', () => {
          orderItems[idx].product_name = nameInp.value;
          const match = products.find(p => p.name.toLowerCase() === nameInp.value.toLowerCase());
          if (match) {
            orderItems[idx].unit_price = match.price;
            priceInp.value = match.price;
          }
          suggestions.hidden = true;
          nameInp.setAttribute('aria-expanded', 'false');
          updateCalculations();
        });

        qtyInp.addEventListener('input', () => {
          orderItems[idx].quantity = Number(qtyInp.value) || 0;
          updateCalculations();
        });

        priceInp.addEventListener('input', () => {
          orderItems[idx].unit_price = Number(priceInp.value) || 0;
          updateCalculations();
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
        depositInput.value = Math.round(totalAmount * pct);
        updateCalculations();
      });
    });

    const closeModal = () => modalWrapper.remove();
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-order').addEventListener('click', closeModal);
    modalEl.querySelector('#btn-delivery-note').addEventListener('click', async event => {
      const client = selectedClient();
      if (!client) {
        alert(i18nService.text('Por favor elegí un cliente.'));
        return;
      }
      const currentOrder = {
        ...existingOrder,
        id: existingOrder?.id || 'BORRADOR',
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        client_address: client.address,
        created_at: modalEl.querySelector('#order-created-date').value,
        delivery_date: modalEl.querySelector('#order-delivery-date').value,
        items: orderItems.map(item => ({ ...item }))
      };
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await generatePdfDeliveryReceipt(currentOrder, client).download();
        window.showToast?.('Remito de transporte descargado');
      } catch (error) {
        alert(error.message || 'No se pudo preparar el remito de transporte.');
      } finally {
        button.disabled = false;
      }
    });
    modalWrapper.querySelector('#btn-order-history')?.addEventListener('click', () => {
      showRecordHistory({
        type: 'order',
        id: existingOrder.id,
        current: existingOrder,
        onRestore: async snapshot => {
          await recordRevision('order', existingOrder.id, existingOrder);
          const historicalClient = clients.find(client => Number(client.id) === Number(snapshot.client_id));
          if (historicalClient && snapshot.client_address !== undefined && historicalClient.address !== snapshot.client_address) {
            await recordRevision('client', historicalClient.id, historicalClient);
            await dataService.saveClient({ ...historicalClient, address: snapshot.client_address || '' });
          }
          await dataService.saveOrder(snapshot);
          closeModal();
          loadData();
          if (onRefresh) onRefresh();
        }
      });
    });

    document.getElementById('btn-save-order').addEventListener('click', async () => {
      const clientId = document.getElementById('order-client').value;
      if (!clientId || clientId === '__new_client__') {
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
        created_at: document.getElementById('order-created-date').value,
        delivery_date: document.getElementById('order-delivery-date').value || null,
        items: orderItems
      };

      try {
        await dataService.saveOrder(orderPayload);
        if (existingOrder) await recordRevision('order', existingOrder.id, existingOrder);
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
              Total: <strong>${formatMoney(order.total_amount)}</strong> | Anticipo: <strong>${formatMoney(order.deposit_amount)}</strong> | Saldo: <strong>${formatMoney(Math.max(0, Number(order.total_amount) - Number(order.deposit_amount)))}</strong>
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

  function statusLabel(status) {
    const labels = { Pending: 'Pendiente', 'In Production': 'En fabricación', Delivered: 'Entregado' };
    return i18nService.text(labels[status] || labels.Pending);
  }

  function statusClass(status) {
    return status === 'Delivered' ? 'badge-delivered' : status === 'In Production' ? 'badge-production' : 'badge-pending';
  }

  function statusOptions() {
    return [
      { value: 'Pending', label: i18nService.text('Pendiente') },
      { value: 'In Production', label: i18nService.text('En fabricación') },
      { value: 'Delivered', label: i18nService.text('Entregado') }
    ];
  }

  function bindStatusMenuDismissal(root) {
    const closePicker = picker => {
      const menu = picker.querySelector('.status-menu');
      const button = picker.querySelector('.status-pill');
      if (menu) menu.hidden = true;
      button?.setAttribute('aria-expanded', 'false');
    };
    const closePickers = () => root.querySelectorAll('.status-picker').forEach(closePicker);

    root.addEventListener('click', event => {
      if (!event.target.closest('.status-picker')) closePickers();
    });
    root.addEventListener('focusout', event => {
      const picker = event.target.closest('.status-picker');
      if (picker && !picker.contains(event.relatedTarget)) closePicker(picker);
    });
  }

  loadData();
}
