import { renderDashboardView } from './components/DashboardView.js';
import { renderOrdersView } from './components/OrdersView.js';
import { renderClientsView } from './components/ClientsView.js';
import { renderProductsView } from './components/ProductsView.js';
import { renderSettingsView } from './components/SettingsView.js';
import { dataService, isNativePlatform } from './services/dataService.js';
import { settingsService } from './services/settingsService.js';
import { i18nService } from './services/i18nService.js';

let currentView = 'dashboard';
const mainView = document.getElementById('main-view');
const navButtons = document.querySelectorAll('#app-nav .nav-btn');

// Toast Notification System
window.showToast = (message, duration = 3200) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${escapeHtml(i18nService.text(message))}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Navigation Controller
export function navigateTo(viewName, params = {}) {
  currentView = viewName;

  // Update Nav Tab UI
  navButtons.forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Render View
  mainView.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">Cargando vista...</div>';

  switch (viewName) {
    case 'dashboard':
      renderDashboardView(mainView, {
        onNavigate: navigateTo,
        onRefresh: () => {}
      });
      break;
    case 'orders':
      renderOrdersView(mainView, {
        onRefresh: () => {},
        openNewOrder: params.openNewOrder,
        openOrderId: params.openOrderId
      });
      break;
    case 'clients':
      renderClientsView(mainView, {
        onRefresh: () => {},
        onSelectClientForOrder: (clientId) => {
          navigateTo('orders', { openNewOrder: true, clientId });
        }
      });
      break;
    case 'products':
      renderProductsView(mainView, {
        onRefresh: () => {}
      });
      break;
    case 'settings':
      renderSettingsView(mainView);
      break;
    default:
      renderDashboardView(mainView, { onNavigate: navigateTo });
      break;
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  settingsService.init();
  i18nService.apply(document.body);
  window.addEventListener('app-language-changed', () => {
    i18nService.apply(document.body);
    navigateTo(currentView);
  });
  // Wire Nav buttons
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) navigateTo(view);
    });
  });

  // Initial render
  navigateTo('dashboard');

  console.log('Furniture Manager loaded. Native platform:', isNativePlatform());
});
