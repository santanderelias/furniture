import { settingsService } from './settingsService.js';

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

export function formatMoney(value, currency = settingsService.getSettings().currency || '$') {
  return `${currency}${numberFormatter.format(Number(value) || 0)}`;
}

export function localDateInputValue(value) {
  if (value === null || value === undefined || value === '') return '';
  const calendarDate = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (calendarDate) return calendarDate[1];
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value, language = settingsService.getSettings().language || 'es') {
  if (!value) return '—';
  const dateString = String(value);
  const calendarDate = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = calendarDate
    ? new Date(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]), 12)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-AR', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(date);
}

export function sortOrders(orders, mode = 'added') {
  const timestamp = (order, field) => {
    const parsed = Date.parse(order[field] || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const compareText = (left, right, field) =>
    String(left[field] || '').localeCompare(String(right[field] || ''), undefined, { sensitivity: 'base' });
  const newestFirst = (left, right, field) =>
    timestamp(right, field) - timestamp(left, field) || timestamp(right, 'added_at') - timestamp(left, 'added_at') ||
    (Number(right.id) || 0) - (Number(left.id) || 0);

  return [...orders].sort((left, right) => {
    if (mode === 'edited') return newestFirst(left, right, 'updated_at');
    if (mode === 'name') return compareText(left, right, 'client_name') || newestFirst(left, right, 'added_at');
    if (mode === 'address') return compareText(left, right, 'client_address') || newestFirst(left, right, 'added_at');
    return (Number(right.id) || 0) - (Number(left.id) || 0) || newestFirst(left, right, 'added_at');
  });
}