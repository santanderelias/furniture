import { dataService } from '../services/dataService.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { renderDesktopBanner } from './DesktopBanner.js';
import { i18nService } from '../services/i18nService.js';

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
      console.error('Error loading dashboard data:', err);
      container.innerHTML = `<div class="error-msg">Failed to load dashboard: ${err.message}</div>`;
    }
  };

  const render = () => {
    const rev = Number(stats?.totalRevenue) || 0;
    const dep = Number(stats?.totalDeposits) || 0;
    const bal = Number(stats?.pendingBalance) || 0;
    const ordersSlice = (recentOrders || []).slice(0, 5);

    container.innerHTML = `
      <!-- Desktop Access Banner Mount -->
      <div id="desktop-banner-mount"></div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background:#fef3c7; color:#b45309;">💰</div>
          <div class="metric-info">
            <span class="metric-label">Total Revenue</span>
            <span class="metric-value">$${rev.toFixed(2)}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:#fee2e2; color:#b91c1c;">⏳</div>
          <div class="metric-info">
            <span class="metric-label">Pending Balance Due</span>
            <span class="metric-value" style="color:#b91c1c;">$${bal.toFixed(2)}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:#e0f2fe; color:#0369a1;">📦</div>
          <div class="metric-info">
            <span class="metric-label">Total Orders</span>
            <span class="metric-value">${stats?.totalOrders || 0}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:#f3e8ff; color:#7e22ce;">👥</div>
          <div class="metric-info">
            <span class="metric-label">Total Clients</span>
            <span class="metric-value">${stats?.totalClients || 0}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:#ecfdf5; color:#047857;">🪑</div>
          <div class="metric-info">
            <span class="metric-label">Catalog Pieces</span>
            <span class="metric-value">${stats?.totalProducts || 0}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions Toolbar -->
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem;">
        <button id="quick-new-order" class="btn btn-primary">
          ➕ New Order / Quote
        </button>
        <button id="quick-new-client" class="btn btn-outline">
          👥 Add Client
        </button>
        <button id="quick-new-product" class="btn btn-outline">
          🪑 Add Furniture Piece
        </button>
      </div>

      <!-- Recent Orders Section -->
      <div class="section-header">
        <div class="section-title">
          <span>🕒 Recent Orders & Production</span>
        </div>
        <button id="view-all-orders" class="btn btn-outline btn-sm">
          View All Orders →
        </button>
      </div>

      ${ordersSlice.length === 0 ? `
        <div class="card-table-wrapper" style="padding: 2rem; text-align: center; color: var(--text-muted);">
          No orders yet. Click "New Order / Quote" to create your first client order.
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
                <th style="text-align:right;">Balance</th>
                <th style="text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${ordersSlice.map(o => {
                const badge = o.status === 'Delivered' ? 'badge-delivered' : o.status === 'In Production' ? 'badge-production' : 'badge-pending';
                const itemsCount = (o.items || []).length;
                const itemsPreview = (o.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'Custom item';
                const b = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.deposit_amount) || 0));

                return `
                  <tr class="clickable-row" data-id="${o.id}" tabindex="0" aria-label="Edit order ${o.id}">
                    <td><strong>#${String(o.id).padStart(4, '0')}</strong></td>
                    <td>
                      <div style="font-weight:600;">${escapeHtml(o.client_name || 'Walk-in Client')}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(o.client_phone || '')}</div>
                    </td>
                    <td><span class="badge ${badge}">${o.status}</span></td>
                    <td style="max-width:180px; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(itemsPreview)}">
                      ${escapeHtml(itemsPreview)}
                    </td>
                    <td style="text-align:right; font-weight:700;">$${Number(o.total_amount).toFixed(2)}</td>
                    <td style="text-align:right; font-weight:700; color:${b > 0 ? '#b45309' : '#059669'};">
                      $${b.toFixed(2)}
                    </td>
                    <td style="text-align:center;">
                      <button class="btn btn-outline btn-sm btn-quick-receipt" data-id="${o.id}">
                        🧾 PDF Receipt
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="mobile-order-cards">
          ${ordersSlice.map(o => {
            const itemsPreview = (o.items || []).map(item => `${item.quantity}× ${item.product_name}`).join(', ') || 'Custom item';
            const balance = Math.max(0, (Number(o.total_amount) || 0) - (Number(o.deposit_amount) || 0));
            const badge = o.status === 'Delivered' ? 'badge-delivered' : o.status === 'In Production' ? 'badge-production' : 'badge-pending';
            return `
              <article class="order-card" data-id="${o.id}" tabindex="0" aria-label="Edit order ${o.id}">
                <div class="order-card-header">
                  <div class="order-card-title">Order #${String(o.id).padStart(4, '0')}</div>
                  <span class="badge ${badge}">${escapeHtml(o.status || 'Pending')}</span>
                </div>
                <div class="order-card-client">${escapeHtml(o.client_name || 'Walk-in Client')}</div>
                <div class="item-card-meta">${escapeHtml(o.client_phone || '')}</div>
                <div class="order-card-items">${escapeHtml(itemsPreview)}</div>
                <div class="order-card-finances">
                  <div><span class="item-card-meta">Total</span><br><strong>$${Number(o.total_amount).toFixed(2)}</strong></div>
                  <div><span class="item-card-meta">Deposit</span><br><strong>$${Number(o.deposit_amount).toFixed(2)}</strong></div>
                  <div><span class="item-card-meta">Balance</span><br><strong>$${balance.toFixed(2)}</strong></div>
                </div>
                <div class="order-card-actions">
                  <button class="btn btn-outline btn-sm btn-quick-receipt" data-id="${o.id}">🧾 PDF Receipt</button>
                  <button class="btn btn-outline btn-sm btn-open-order" data-id="${o.id}">✏ Edit</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `}
    `;
    i18nService.apply(container);

    // Render Banner inside mount
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
      btn.addEventListener('click', async () => {
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
            window.showToast?.('Factura guardada en Descargas.');
          } catch (err) {
            alert(err.message || 'No se pudo guardar la factura PDF.');
          }
        }
      });
    });

    const openOrder = (id) => onNavigate('orders', { openOrderId: Number(id) });
    container.querySelectorAll('.clickable-row, .order-card').forEach(item => {
      const activate = (event) => {
        if (event.target.closest('button, a')) return;
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
      btn.addEventListener('click', () => openOrder(btn.dataset.id));
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
