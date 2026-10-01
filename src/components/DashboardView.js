import { dataService } from '../services/dataService.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { renderDesktopBanner } from './DesktopBanner.js';
import { i18nService } from '../services/i18nService.js';
import { formatDate, formatMoney, sortOrders } from '../services/formatService.js';

export function renderDashboardView(container, { onNavigate, onRefresh } = {}) {
  let stats = null;
  let recentOrders = [];
  let serverInfo = null;

  const loadData = async () => {
    try {
      [stats, recentOrders, serverInfo] = await Promise.all([
        dataService.getStats(),
        dataService.getOrders(),
        dataService.getServerInfo()
      ]);
      render();
    } catch (err) {
      console.error('Error al cargar datos del panel:', err);
      container.innerHTML = `<div class="error-msg">Error al cargar el resumen: ${err.message}</div>`;
    }
  };

  const render = () => {
    const rev = Number(stats?.totalRevenue) || 0;
    const bal = Number(stats?.pendingBalance) || 0;
    const ordersSlice = sortOrders(recentOrders || [], 'added').slice(0, 5);

    container.innerHTML = `
      <!-- Banner de acceso remoto -->
      <div id="desktop-banner-mount"></div>

      <!-- Métricas del negocio -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Ingresos totales</span>
            <span class="metric-value">${formatMoney(rev)}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Saldo pendiente</span>
            <span class="metric-value text-danger">${formatMoney(bal)}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Pedidos totales</span>
            <span class="metric-value">${stats?.totalOrders || 0}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Clientes totales</span>
            <span class="metric-value">${stats?.totalClients || 0}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-info">
            <span class="metric-label">Productos en catálogo</span>
            <span class="metric-value">${stats?.totalProducts || 0}</span>
          </div>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="quick-actions-bar">
        <button id="quick-new-order" class="btn btn-primary">
          Nuevo pedido
        </button>
        <button id="quick-new-client" class="btn btn-outline">
          Agregar cliente
        </button>
        <button id="quick-new-product" class="btn btn-outline">
          Agregar mueble
        </button>
      </div>

      <!-- Sección de pedidos recientes -->
      <div class="section-header">
        <div class="section-title">
          <span>Pedidos recientes y fabricación</span>
        </div>
        <button id="view-all-orders" class="btn btn-outline btn-sm">
          Ver todos los pedidos &rarr;
        </button>
      </div>

      ${ordersSlice.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2rem; text-align: center; color: var(--text-muted);">
          Todavía no hay pedidos registrados. Hacé clic en "Nuevo pedido" para crear el primero.
        </div>
      ` : `
        <div class="order-card-list recent-order-card-list">
          ${ordersSlice.map(o => {
            const badge = o.status === 'Delivered' ? 'badge-delivered' : o.status === 'In Production' ? 'badge-production' : 'badge-pending';
            const statusText = o.status === 'Delivered' ? 'Entregado' : o.status === 'In Production' ? 'En fabricación' : 'Pendiente';
            const itemsPreview = (o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Mueble personalizado';
            const balance = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.deposit_amount) || 0));

            return `
              <article class="order-card recent-order-card clickable-row" data-id="${o.id}" tabindex="0" aria-label="${i18nService.getLanguage() === 'en' ? `Edit order #${o.id}` : `Editar pedido #${o.id}`} ">
                <div class="order-card-heading">
                  <div>
                    <div class="order-card-number">#${String(o.id).padStart(4, '0')}</div>
                    <div class="row-title">${escapeHtml(o.client_name || 'Cliente de mostrador')}</div>
                    <div class="row-subtitle">${escapeHtml(o.client_phone || '')}</div>
                    ${o.client_address ? `<div class="row-subtitle order-card-address">${escapeHtml(o.client_address)}</div>` : ''}
                  </div>
                  <span class="badge ${badge}">${statusText}</span>
                </div>
                <div class="order-card-dates">
                  <div><span>Fecha del pedido</span><time>${formatDate(o.created_at)}</time></div>
                  <div><span>Fecha de entrega</span><time>${formatDate(o.delivery_date)}</time></div>
                </div>
                <div class="order-card-totals">
                  <div><span>Total</span><strong>${formatMoney(o.total_amount)}</strong></div>
                  <div><span>Saldo</span><strong class="${balance > 0 ? 'text-warning' : 'text-success'}">${formatMoney(balance)}</strong></div>
                </div>
                <div class="order-card-items"><strong>Detalle:</strong><span>${escapeHtml(itemsPreview)}</span></div>
                <div class="action-buttons order-card-actions">
                  <button class="btn btn-outline btn-sm btn-quick-receipt" data-id="${o.id}">Recibo PDF</button>
                  <button class="btn btn-outline btn-sm btn-open-order" data-id="${o.id}">Editar</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Render Banner
    const bannerMount = container.querySelector('#desktop-banner-mount');
    if (bannerMount) {
      renderDesktopBanner(bannerMount, serverInfo, () => {
        loadData();
        if (onRefresh) onRefresh();
      });
      i18nService.apply(bannerMount);
    }

    // Quick Action Listeners
    container.querySelector('#quick-new-order')?.addEventListener('click', () => {
      onNavigate('orders', { openNewOrder: true });
    });

    container.querySelector('#quick-new-client')?.addEventListener('click', () => {
      onNavigate('clients');
    });

    container.querySelector('#quick-new-product')?.addEventListener('click', () => {
      onNavigate('products');
    });

    container.querySelector('#view-all-orders')?.addEventListener('click', () => {
      onNavigate('orders');
    });

    container.querySelectorAll('.btn-quick-receipt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const order = recentOrders.find(o => Number(o.id) === id);
        if (order) {
          const client = {
            name: order.client_name,
            phone: order.client_phone,
            address: order.client_address
          };
          try {
            const pdfDoc = generatePdfReceipt(order, client);
            await pdfDoc.download();
            window.showToast?.('Factura guardada en Descargas');
          } catch (err) {
            alert(err.message || 'No se pudo guardar la factura PDF.');
          }
        }
      });
    });

    const openOrder = (id) => onNavigate('orders', { openOrderId: Number(id) });
    container.querySelectorAll('.clickable-row').forEach(item => {
      const activate = (event) => {
        if (event.target.closest('button, select, a')) return;
        openOrder(item.dataset.id);
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', (event) => {
        if (event.target !== item) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(event);
        }
      });
    });
    container.querySelectorAll('.btn-open-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openOrder(btn.dataset.id);
      });
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
