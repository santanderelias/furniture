import { settingsService } from './settingsService.js';
import { dataService } from './dataService.js';
import { formatDate, formatMoney, localDateInputValue } from './formatService.js';

function historySnapshot(type, record) {
  if (type === 'client') {
    return { id: record.id, name: record.name, phone: record.phone, address: record.address, notes: record.notes };
  }
  if (type === 'product') {
    return {
      id: record.id,
      name: record.name,
      category: record.category,
      price: record.price,
      stock: record.stock,
      description: record.description
    };
  }
  return {
    id: record.id,
    client_id: record.client_id,
    client_address: record.client_address,
    status: record.status,
    total_amount: record.total_amount,
    deposit_amount: record.deposit_amount,
    created_at: localDateInputValue(record.created_at),
    delivery_date: localDateInputValue(record.delivery_date),
    items: record.items || []
  };
}

export function recordRevision(type, id, snapshot) {
  return dataService.recordRevision(type, id, historySnapshot(type, snapshot));
}

export async function showRecordHistory({ type, id, current, onRestore }) {
  const isEnglish = settingsService.getSettings().language === 'en';
  let revisions;
  try {
    revisions = await dataService.getRecordHistory(type, id);
  } catch (error) {
    alert(error.message || (isEnglish ? 'Could not load edit history.' : 'No se pudo cargar el historial.'));
    return;
  }
  const wrapper = document.createElement('div');
  const title = isEnglish ? 'Edit history' : 'Historial de cambios';
  const restoreLabel = isEnglish ? 'Restore' : 'Restaurar';
  const emptyMessage = isEnglish ? 'No previous edits have been recorded.' : 'Todavía no hay cambios anteriores registrados.';
  const fields = {
    name: isEnglish ? 'Name' : 'Nombre',
    phone: isEnglish ? 'Phone' : 'Teléfono',
    address: isEnglish ? 'Address' : 'Dirección',
    notes: isEnglish ? 'Notes' : 'Notas',
    category: isEnglish ? 'Category' : 'Categoría',
    price: isEnglish ? 'Price' : 'Precio',
    stock: isEnglish ? 'Stock' : 'Existencias',
    description: isEnglish ? 'Description' : 'Descripción',
    client_id: isEnglish ? 'Client' : 'Cliente',
    client_address: isEnglish ? 'Delivery address' : 'Dirección de entrega',
    status: isEnglish ? 'Status' : 'Estado',
    total_amount: isEnglish ? 'Total' : 'Total',
    deposit_amount: isEnglish ? 'Deposit' : 'Anticipo',
    created_at: isEnglish ? 'Order date' : 'Fecha del pedido',
    delivery_date: isEnglish ? 'Delivery date' : 'Fecha de entrega',
    items: isEnglish ? 'Items' : 'Artículos'
  };

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const displayValue = (key, value) => {
    if (key === 'created_at' || key === 'delivery_date') return formatDate(value, isEnglish ? 'en' : 'es');
    if (key === 'items' && Array.isArray(value)) {
      return value.map(item => {
        const name = item.product_name || (isEnglish ? 'Custom furniture' : 'Mueble personalizado');
        return `${item.quantity || 0} × ${name} (${formatMoney(item.unit_price)})`;
      }).join('; ');
    }
    if (key === 'status') {
      const statusLabels = isEnglish
        ? { Pending: 'Pending', 'In Production': 'In production', Delivered: 'Delivered' }
        : { Pending: 'Pendiente', 'In Production': 'En fabricación', Delivered: 'Entregado' };
      return statusLabels[value] || String(value ?? '—');
    }
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—');
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  };
  const revisionMarkup = revisions.map((revision, index) => {
    const snapshot = revision.snapshot;
    const currentSnapshot = historySnapshot(type, current);
    const changedFields = [...new Set([...Object.keys(snapshot), ...Object.keys(currentSnapshot)])]
      .filter(key => JSON.stringify(snapshot[key]) !== JSON.stringify(currentSnapshot[key]));
    const changes = changedFields.map(key => `
      <div class="history-diff-row">
        <strong>${escape(fields[key] || key)}</strong>
        <span>${escape(displayValue(key, currentSnapshot[key]))}</span>
        <span aria-hidden="true">&rarr;</span>
        <span>${escape(displayValue(key, snapshot[key]))}</span>
      </div>
    `).join('');
    const date = new Date(revision.timestamp).toLocaleString(isEnglish ? 'en-US' : 'es-AR');
    return `
      <article class="history-entry">
        <div class="history-entry-heading">
          <time>${escape(date)}</time>
          <button class="btn btn-outline btn-sm history-restore" data-index="${index}" type="button">${restoreLabel}</button>
        </div>
        ${changes || `<p class="history-no-diff">${isEnglish ? 'No field differences.' : 'Sin diferencias de campos.'}</p>`}
      </article>
    `;
  }).join('');

  wrapper.innerHTML = `
    <div class="modal-overlay" id="record-history-modal">
      <div class="modal-content history-modal-content">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" type="button" aria-label="${isEnglish ? 'Close' : 'Cerrar'}">&times;</button>
        </div>
        <div class="modal-body history-list">
          ${revisionMarkup || `<p class="history-empty">${emptyMessage}</p>`}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const close = () => wrapper.remove();
  wrapper.querySelector('.modal-close').addEventListener('click', close);
  wrapper.querySelectorAll('.history-restore').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await onRestore(revisions[Number(button.dataset.index)].snapshot);
        close();
      } catch (error) {
        button.disabled = false;
        alert(error.message || (isEnglish ? 'Could not restore this revision.' : 'No se pudo restaurar esta versión.'));
      }
    });
  });
}