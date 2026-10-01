import { zipSync } from 'fflate';
import { dataService, isNativePlatform } from './dataService.js';
import { i18nService } from './i18nService.js';

const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
})[character]);

const columnName = index => {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name;
  }
  return name;
};

const createSheetXml = (headers, rows) => {
  const allRows = [headers, ...rows];
  const rowXml = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (rowIndex === 0) return `<c r="${ref}" s="1" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
};

export const makeXlsx = sheets => {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs></styleSheet>`
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = createSheetXml(sheet.headers, sheet.rows);
  });
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, contents]) => [path, new TextEncoder().encode(contents)])));
};

const toCsv = (headers, rows) => {
  const quote = value => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `\uFEFF${[headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n')}`;
};

const workbookData = async () => {
  const [orders, clients, products] = await Promise.all([
    dataService.getOrders(), dataService.getClients(), dataService.getProducts()
  ]);
  const language = i18nService.getLanguage();
  const sheetNames = language === 'es'
    ? { Orders: 'Pedidos', Clients: 'Clientes', Products: 'Productos' }
    : { Orders: 'Orders', Clients: 'Clients', Products: 'Products' };
  const headers = {
    Orders: ['ID', 'Client', 'Phone', 'Delivery address', 'Status', 'Order date', 'Delivery date', 'Total', 'Deposit', 'Balance', 'Items'],
    Clients: ['ID', 'Name', 'Phone', 'Address', 'Notes', 'Created at'],
    Products: ['ID', 'Name', 'Category', 'Price', 'Stock', 'Description', 'Created at']
  };
  Object.keys(headers).forEach(sheet => {
    headers[sheet] = headers[sheet].map(value => i18nService.text(value));
  });
  return [
    {
      key: 'Orders', name: sheetNames.Orders, headers: headers.Orders,
      rows: orders.map(order => [
        Number(order.id), order.client_name || '', order.client_phone || '', order.client_address || '',
        order.status, order.created_at || '', order.delivery_date || '', Number(order.total_amount) || 0,
        Number(order.deposit_amount) || 0, Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0)),
        (order.items || []).map(item => `${item.quantity} x ${item.product_name}`).join('; ')
      ])
    },
    {
      key: 'Clients', name: sheetNames.Clients, headers: headers.Clients,
      rows: clients.map(client => [Number(client.id), client.name || '', client.phone || '', client.address || '', client.notes || '', client.created_at || ''])
    },
    {
      key: 'Products', name: sheetNames.Products, headers: headers.Products,
      rows: products.map(product => [Number(product.id), product.name || '', product.category || '', Number(product.price) || 0, Number(product.stock) || 0, product.description || '', product.created_at || ''])
    }
  ];
};

const downloadBlob = async (blob, fileName) => {
  if (isNativePlatform()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    await dataService.downloadExport(btoa(binary), fileName, blob.type || 'application/octet-stream');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export async function exportOperations({ format, mode, dataset }) {
  if (format === 'sqlite') {
    const blob = await dataService.exportDatabase();
    await downloadBlob(blob, 'furniture.db');
    return;
  }

  const sheets = await workbookData();
  const outputSheets = mode === 'template'
    ? sheets.map(sheet => ({ ...sheet, rows: [] }))
    : sheets;
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const sheet = sheets.find(item => item.key === dataset) || sheets[0];
    const rows = mode === 'template' ? [] : sheet.rows;
    await downloadBlob(new Blob([toCsv(sheet.headers, rows)], { type: 'text/csv;charset=utf-8' }), `${sheet.name}-${mode}-${timestamp}.csv`);
    return;
  }

  const bytes = makeXlsx(outputSheets);
  await downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `furniture-operations-${mode}-${timestamp}.xlsx`);
}