import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import { dataService, isNativePlatform } from './dataService.js';
import { settingsService } from './settingsService.js';
import { formatDate, formatMoney } from './formatService.js';

const virtualFileSystem = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs || pdfFonts;
if (!virtualFileSystem || !Object.keys(virtualFileSystem).length) {
  throw new Error('PDF fonts could not be loaded. Reinstall dependencies and rebuild the app.');
}
if (typeof pdfMake.addVirtualFileSystem === 'function') {
  pdfMake.addVirtualFileSystem(virtualFileSystem);
} else {
  pdfMake.vfs = virtualFileSystem;
}

const labels = {
  es: {
    invoiceTitle: 'FACTURA / RECIBO', brandSubtitle: 'Muebles artesanales y carpintería a medida',
    customer: 'DATOS DEL CLIENTE', payment: 'RESUMEN DE PAGO', subtotalAmount: 'Subtotal:', taxAmount: 'IVA / Impuesto:', total: 'Total del pedido:', deposit: 'Anticipo pagado:', balance: 'Saldo pendiente:', paid: 'PAGADO EN SU TOTALIDAD', partial: 'ANTICIPO PARCIAL - SALDO A LA ENTREGA',
    items: 'DETALLE DEL PEDIDO', number: 'N.º', description: 'Descripción', quantity: 'Cant.', unitPrice: 'Precio unitario', lineTotal: 'Importe',
    terms: 'TÉRMINOS DE PRODUCCIÓN Y GARANTÍA',
    subtotal: 'Subtotal:', received: 'Anticipo recibido:', signatureClient: 'Aceptación y firma del cliente', signatureMaker: 'Firma del fabricante', phone: 'Teléfono:', email: 'Email:', address: 'Dirección:', delivery: 'Entrega:', deliveryDate: 'Fecha de entrega:', notes: 'Notas:', date: 'Fecha:', receipt: 'Recibo:', custom: 'Mueble personalizado', walkIn: 'Cliente de mostrador', pickup: 'Retiro en taller',
    status: { Pending: 'PENDIENTE', 'In Production': 'EN FABRICACIÓN', Delivered: 'ENTREGADO' }
  },
  en: {
    invoiceTitle: 'INVOICE / RECEIPT', brandSubtitle: 'Handcrafted furniture and custom woodwork',
    customer: 'CUSTOMER INFORMATION', payment: 'PAYMENT BREAKDOWN', subtotalAmount: 'Subtotal:', taxAmount: 'Tax:', total: 'Order total:', deposit: 'Deposit paid:', balance: 'Balance due:', paid: 'PAID IN FULL', partial: 'PARTIAL DEPOSIT - BALANCE UPON DELIVERY',
    items: 'ORDER DETAILS', number: 'No.', description: 'Description', quantity: 'Qty', unitPrice: 'Unit price', lineTotal: 'Amount',
    terms: 'PRODUCTION & WARRANTY TERMS',
    subtotal: 'Subtotal:', received: 'Deposit received:', signatureClient: 'Customer acceptance & signature', signatureMaker: 'Craftsman signature', phone: 'Phone:', email: 'Email:', address: 'Address:', delivery: 'Delivery:', deliveryDate: 'Delivery date:', notes: 'Notes:', date: 'Date:', receipt: 'Receipt:', custom: 'Custom furniture piece', walkIn: 'Walk-in customer', pickup: 'Workshop pickup',
    status: { Pending: 'PENDING', 'In Production': 'IN PRODUCTION', Delivered: 'DELIVERED' }
  }
};

const asBlob = (generator) => new Promise((resolve, reject) => {
  try {
    generator.getBlob(resolve);
  } catch (error) {
    reject(error);
  }
});

const asBase64 = (generator) => new Promise((resolve, reject) => {
  try {
    generator.getBase64(resolve);
  } catch (error) {
    reject(error);
  }
});

const createPdfActions = (pdf, fileName) => ({
  getBlob: () => asBlob(pdf),
  getBase64: () => asBase64(pdf),
  async download() {
    if (isNativePlatform()) {
      const base64 = await asBase64(pdf);
      const result = await dataService.downloadInvoice(base64, fileName);
      if (result) return result;
    }
    const url = URL.createObjectURL(await asBlob(pdf));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true, fileName };
  },
  async open() {
    if (isNativePlatform()) {
      const result = await dataService.openInvoice(await asBase64(pdf), fileName);
      if (result) return result;
    }
    const tab = window.open('about:blank', '_blank');
    if (!tab) throw new Error('El navegador bloqueó la ventana de vista previa. Permite ventanas emergentes para este sitio.');
    const url = URL.createObjectURL(await asBlob(pdf));
    tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return { success: true, fileName };
  },
  async print() {
    if (isNativePlatform()) {
      const result = await dataService.printInvoice(await asBase64(pdf), fileName);
      if (result) return result;
    }
    const tab = window.open('about:blank', '_blank');
    if (!tab) throw new Error('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio.');
    const url = URL.createObjectURL(await asBlob(pdf));
    tab.document.write(`<iframe title="Documento PDF" src="${url}" style="border:0;width:100%;height:100%"></iframe>`);
    tab.document.close();
    tab.addEventListener('load', () => setTimeout(() => tab.print(), 500), { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return { success: true, fileName };
  }
});

export const generatePdfReceipt = (order, client = {}, settingsOverride = null) => {
  const settings = settingsOverride || settingsService.getSettings();
  const invoice = settings.invoice || {};
  const language = settings.language === 'en' ? 'en' : 'es';
  const text = labels[language];
  const currency = settings.currency || '$';
  const taxRate = Number(settings.taxRate) || 0;
  const money = value => formatMoney(value, currency);

  const clientName = client.name || order.client_name || text.walkIn;
  const clientPhone = client.phone || order.client_phone || '—';
  const clientAddress = client.address || order.client_address || text.pickup;
  const clientNotes = client.notes || '';

  const workshopName = settings.workshopName || 'Leo Woodcrafts & Muebles';
  const invoicePhone = String(invoice.phone || '').trim();
  const invoiceEmail = String(invoice.email || '').trim();
  const invoiceAddress = String(invoice.address || '').trim();
  const customTerms = String(invoice.terms || '').trim();

  const orderDate = formatDate(order.created_at || new Date(), language);

  const rawTotal = Number(order.total_amount) || 0;
  let subtotalAmount = rawTotal;
  let taxAmount = 0;
  if (taxRate > 0) {
    taxAmount = (rawTotal * taxRate) / 100;
  }
  const total = rawTotal + taxAmount;
  const deposit = Number(order.deposit_amount) || 0;
  const balance = Math.max(0, total - deposit);
  const paid = balance <= 0.01;

  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : [{ product_name: text.custom, quantity: 1, unit_price: rawTotal, subtotal: rawTotal }];

  const tableBody = [[
    { text: text.number, style: 'tableHeader', alignment: 'center' },
    { text: text.description, style: 'tableHeader' },
    { text: text.quantity, style: 'tableHeader', alignment: 'center' },
    { text: text.unitPrice, style: 'tableHeader', alignment: 'right' },
    { text: text.lineTotal, style: 'tableHeader', alignment: 'right' }
  ]];

  items.forEach((item, index) => {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const subtotal = Number(item.subtotal) || quantity * unitPrice;
    tableBody.push([
      { text: String(index + 1), alignment: 'center', margin: [0, 4, 0, 4] },
      { text: item.product_name || text.custom, margin: [0, 4, 0, 4] },
      { text: String(quantity), alignment: 'center', margin: [0, 4, 0, 4] },
      { text: money(unitPrice), alignment: 'right', margin: [0, 4, 0, 4] },
      { text: money(subtotal), alignment: 'right', bold: true, margin: [0, 4, 0, 4] }
    ]);
  });

  const compact = invoice.layout === 'compact';
  const termsContent = customTerms || (language === 'es'
    ? '• Garantía estructural de 5 años en ensambles de madera maciza.\n• Mantené la humedad ambiente entre 35% y 50% para proteger la madera.\n• El saldo se cancela al momento de la entrega.'
    : '• 5-year structural warranty on solid wood joints.\n• Maintain indoor humidity between 35% and 50%.\n• Final balance is due on delivery.');

  const classicDetails = compact ? [] : [{
    margin: [0, 14, 0, 0],
    columns: [
      {
        width: '55%',
        stack: [
          { text: text.terms, fontSize: 8, bold: true, color: '#475569', margin: [0, 0, 0, 3] },
          { text: termsContent, fontSize: 7.5, color: '#64748b', leading: 1.3 }
        ]
      },
      {
        width: '45%',
        table: {
          widths: ['*', 90],
          body: [
            [{ text: text.subtotal, fontSize: 9 }, { text: money(rawTotal), alignment: 'right', fontSize: 9 }],
            ...(taxRate > 0 ? [[{ text: `${text.taxAmount} (${taxRate}%)`, fontSize: 9 }, { text: money(taxAmount), alignment: 'right', fontSize: 9 }]] : []),
            [{ text: text.received, fontSize: 9, color: '#059669' }, { text: money(deposit), alignment: 'right', fontSize: 9, color: '#059669' }],
            [{ text: text.balance, fontSize: 10, bold: true, color: '#92400e' }, { text: money(balance), alignment: 'right', fontSize: 10, bold: true, color: '#92400e' }]
          ]
        },
        layout: 'noBorders'
      }
    ]
  }, {
    margin: [0, 24, 0, 0],
    columns: [
      { width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }] }, { text: text.signatureClient, fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] }] },
      { width: '10%', text: '' },
      { width: '45%', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }] }, { text: text.signatureMaker, fontSize: 8, color: '#64748b', margin: [0, 4, 0, 0] }] }
    ]
  }];

  const docDefinition = {
    pageSize: invoice.pageSize === 'LETTER' ? 'LETTER' : 'A4',
    pageOrientation: invoice.orientation === 'landscape' ? 'landscape' : 'portrait',
    pageMargins: compact ? [24, 24, 24, 24] : [36, 36, 36, 36],
    content: [
      {
        columns: [
          [
            { text: workshopName, fontSize: 18, bold: true, color: '#92400e' },
            { text: invoice.subtitle || text.brandSubtitle, fontSize: 9, color: '#64748b', margin: [0, 2, 0, 4] },
            ...(invoicePhone ? [{ text: `${text.phone} ${invoicePhone}`, fontSize: 8.5, color: '#64748b' }] : []),
            ...(invoiceEmail ? [{ text: `${text.email} ${invoiceEmail}`, fontSize: 8.5, color: '#64748b' }] : []),
            ...(invoiceAddress ? [{ text: `${text.address} ${invoiceAddress}`, fontSize: 8.5, color: '#64748b' }] : [])
          ],
          [
            { text: invoice.title || text.invoiceTitle, fontSize: 14, bold: true, alignment: 'right', color: '#1e293b' },
            { text: `${text.receipt} REC-${String(order.id || 1).padStart(5, '0')}`, fontSize: 10, bold: true, alignment: 'right', margin: [0, 2, 0, 0] },
            { text: `${text.date} ${orderDate}`, fontSize: 9, alignment: 'right', color: '#64748b' },
            ...(order.delivery_date ? [{ text: `${text.deliveryDate} ${formatDate(order.delivery_date, language)}`, fontSize: 9, alignment: 'right', color: '#64748b' }] : [])
          ]
        ]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 523, y2: 10, lineWidth: 1.5, lineColor: '#e2e8f0' }], margin: [0, 5, 0, 12] },
      {
        columns: [
          {
            width: '48%',
            table: { widths: ['*'], body: [[{ fillColor: '#f8fafc', margin: [8, 8, 8, 8], stack: [
              { text: text.customer, fontSize: 9, bold: true, color: '#64748b', margin: [0, 0, 0, 4] },
              { text: clientName, fontSize: 11, bold: true, color: '#0f172a' },
              { text: `${text.phone} ${clientPhone}`, fontSize: 9, color: '#334155', margin: [0, 2, 0, 0] },
              { text: `${text.delivery} ${clientAddress}`, fontSize: 9, color: '#334155', margin: [0, 2, 0, 0] },
              ...(clientNotes ? [{ text: `${text.notes} ${clientNotes}`, fontSize: 8, italics: true, color: '#64748b', margin: [0, 4, 0, 0] }] : [])
            ] }]] },
            layout: 'noBorders'
          },
          { width: '4%', text: '' },
          {
            width: '48%',
            table: { widths: ['*'], body: [[{ fillColor: '#f8fafc', margin: [8, 8, 8, 8], stack: [
              { text: text.payment, fontSize: 9, bold: true, color: '#64748b', margin: [0, 0, 0, 4] },
              ...(taxRate > 0 ? [{ columns: [{ text: text.subtotalAmount, fontSize: 8.5 }, { text: money(rawTotal), fontSize: 8.5, alignment: 'right' }] }] : []),
              ...(taxRate > 0 ? [{ columns: [{ text: `${text.taxAmount} (${taxRate}%)`, fontSize: 8.5 }, { text: money(taxAmount), fontSize: 8.5, alignment: 'right' }] }] : []),
              { columns: [{ text: text.total, fontSize: 9, bold: true }, { text: money(total), fontSize: 9, bold: true, alignment: 'right' }] },
              { columns: [{ text: text.deposit, fontSize: 9, color: '#059669', margin: [0, 3, 0, 0] }, { text: `-${money(deposit)}`, fontSize: 9, bold: true, color: '#059669', alignment: 'right', margin: [0, 3, 0, 0] }] },
              { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 220, y2: 5, lineWidth: 1, lineColor: '#cbd5e1' }], margin: [0, 4, 0, 4] },
              { columns: [{ text: text.balance, fontSize: 10, bold: true, color: paid ? '#059669' : '#b45309' }, { text: money(balance), fontSize: 10, bold: true, color: paid ? '#059669' : '#b45309', alignment: 'right' }] },
              { text: paid ? text.paid : text.partial, fontSize: 8, bold: true, color: paid ? '#059669' : '#d97706', margin: [0, 4, 0, 0] }
            ] }]] },
            layout: 'noBorders'
          }
        ]
      },
      { text: text.items, fontSize: 10, bold: true, color: '#1e293b', margin: [0, 14, 0, 6] },
      {
        table: { headerRows: 1, widths: [25, '*', 40, 80, 80], body: tableBody },
        layout: {
          fillColor: rowIndex => rowIndex === 0 ? '#f1f5f9' : rowIndex % 2 === 0 ? '#fafafa' : null,
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0',
          paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6
        }
      },
      ...classicDetails,
      ...(invoice.footer ? [{ text: invoice.footer, alignment: 'center', fontSize: 8, color: '#64748b', margin: [0, 18, 0, 0] }] : [])
    ],
    styles: { tableHeader: { bold: true, fontSize: 9, color: '#1e293b' } }
  };

  const pdf = pdfMake.createPdf(docDefinition);
  const fileName = `Factura-${String(order.id || 1).padStart(5, '0')}.pdf`;
  return createPdfActions(pdf, fileName);
};

export const generatePdfDeliveryReceipt = (order, client = {}) => {
  const language = settingsService.getSettings().language === 'en' ? 'en' : 'es';
  const text = language === 'es'
    ? {
      title: 'REMITO DE TRANSPORTE', order: 'Pedido', orderDate: 'Fecha del pedido', deliveryDate: 'Fecha de entrega',
      client: 'Cliente', phone: 'Teléfono', address: 'Dirección de entrega', items: 'ARTÍCULOS A ENTREGAR',
      quantity: 'Cantidad', description: 'Descripción', notes: 'NOTAS Y PREFERENCIAS',
      receiver: 'Recibido por', signature: 'Firma', delivery: 'Entrega'
    }
    : {
      title: 'DELIVERY RECEIPT', order: 'Order', orderDate: 'Order date', deliveryDate: 'Delivery date',
      client: 'Client', phone: 'Phone', address: 'Delivery address', items: 'ITEMS TO DELIVER',
      quantity: 'Quantity', description: 'Description', notes: 'CLIENT NOTES AND PREFERENCES',
      receiver: 'Received by', signature: 'Signature', delivery: 'Delivery'
    };
  const items = Array.isArray(order.items) ? order.items : [];
  const body = [[
    { text: text.quantity, style: 'tableHeader', alignment: 'center' },
    { text: text.description, style: 'tableHeader' }
  ]];
  items.forEach(item => body.push([
    { text: String(Number(item.quantity) || 0), alignment: 'center', margin: [0, 5, 0, 5] },
    { text: item.product_name || '—', margin: [0, 5, 0, 5] }
  ]));

  const address = order.client_address || client.address || '';
  const notes = client.notes || order.client_notes || '';
  const orderDate = formatDate(order.created_at, language);
  const deliveryDate = formatDate(order.delivery_date, language);
  const orderNumber = String(order.id || '').padStart(4, '0');
  const pdf = pdfMake.createPdf({
    pageSize: 'A4',
    pageMargins: [38, 42, 38, 42],
    content: [
      { text: text.title, fontSize: 20, bold: true, color: '#92400e', margin: [0, 0, 0, 6] },
      { text: `${text.order} #${orderNumber}`, fontSize: 11, bold: true, margin: [0, 0, 0, 14] },
      {
        columns: [
          { width: '*', stack: [
            { text: text.client.toUpperCase(), fontSize: 8, bold: true, color: '#64748b' },
            { text: client.name || order.client_name || '—', fontSize: 12, bold: true, margin: [0, 3, 0, 6] },
            { text: `${text.phone}: ${client.phone || order.client_phone || '—'}`, fontSize: 9, margin: [0, 0, 0, 4] },
            { text: `${text.address}: ${address || '—'}`, fontSize: 10, bold: true, margin: [0, 0, 0, 4] }
          ] },
          { width: 145, stack: [
            { text: `${text.orderDate}: ${orderDate}`, fontSize: 9, margin: [0, 0, 0, 5] },
            { text: `${text.deliveryDate}: ${deliveryDate}`, fontSize: 9, bold: true }
          ] }
        ],
        columnGap: 16,
        margin: [0, 0, 0, 15]
      },
      { text: text.items, fontSize: 10, bold: true, margin: [0, 0, 0, 6] },
      {
        table: { headerRows: 1, widths: [75, '*'], body },
        layout: {
          fillColor: rowIndex => rowIndex === 0 ? '#f1f5f9' : rowIndex % 2 === 0 ? '#fafafa' : null,
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1',
          paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6
        }
      },
      ...(notes ? [{ text: text.notes, fontSize: 9, bold: true, margin: [0, 18, 0, 4] }, { text: notes, fontSize: 10, color: '#334155' }] : []),
      {
        columns: [
          { width: '50%', stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }], margin: [0, 0, 0, 5] },
            { text: text.receiver, fontSize: 8, color: '#64748b' }
          ] },
          { width: '50%', stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#94a3b8' }], margin: [0, 0, 0, 5] },
            { text: text.signature, fontSize: 8, color: '#64748b' }
          ] }
        ],
        columnGap: 18,
        margin: [0, 42, 0, 0]
      },
      { text: `${text.delivery}: ____________________`, fontSize: 9, color: '#64748b', margin: [0, 18, 0, 0] }
    ],
    styles: { tableHeader: { bold: true, fontSize: 9, color: '#1e293b' } }
  });
  return createPdfActions(pdf, `Remito-Transporte-${orderNumber}.pdf`);
};
