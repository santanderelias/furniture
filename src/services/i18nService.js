import { settingsService } from './settingsService.js';

const translations = {
  en: {
    'Idioma': 'Language',
    'Facturas': 'Invoices',
    'Idioma / Language': 'Language',
    'Facturas / Invoices': 'Invoices',
    'Personaliza el nombre, teléfono, tamaño y diseño que aparecen en el PDF.': 'Customize the name, phone, paper size, and layout shown on the PDF.',
    'Configurar factura': 'Configure invoice',
    '⚙ Configurar factura': '⚙ Configure invoice',
    'Título de la factura': 'Invoice title',
    'Teléfono del negocio': 'Business phone',
    'Descripción del negocio': 'Business description',
    'Tamaño de papel': 'Paper size',
    'Carta (Letter)': 'Letter',
    'Orientación': 'Orientation',
    'Vertical': 'Portrait',
    'Horizontal': 'Landscape',
    'Diseño': 'Layout',
    'Clásico (con firmas y términos)': 'Classic (signatures and terms)',
    'Compacto': 'Compact',
    'Mensaje al pie': 'Footer message',
    'Guardar': 'Save',
    'El título de la factura es obligatorio.': 'Invoice title is required.',
    'Configuración de factura guardada': 'Invoice settings saved',
    'Ver PDF': 'View PDF',
    'Descargar PDF': 'Download PDF',
    'Imprimir': 'Print',
    'Abriendo la factura PDF...': 'Opening invoice PDF...',
    'Factura guardada en Descargas.': 'Invoice saved to Downloads.',
    'Se abrió el diálogo de impresión.': 'Print dialog opened.',
    'No se pudo preparar el PDF: ': 'Could not prepare PDF: ',
    'No se pudo guardar la factura PDF.': 'Could not save the invoice PDF.',
    'Configurar factura': 'Configure invoice',
    'Cancelar': 'Cancel',
    'Factura guardada en Descargas.': 'Invoice saved to Downloads.',
    'Configuración de factura guardada': 'Invoice settings saved'
  },
  es: {
    'Language': 'Idioma',
    'Invoices': 'Facturas',
    '⚙ Configure invoice': '⚙ Configurar factura',
    'Furniture Business Management System': 'Sistema de gestión para negocio de muebles',
    'Local Furniture Management System': 'Sistema local de gestión de muebles',
    'Dashboard': 'Resumen',
    'Orders & Quotes': 'Pedidos y cotizaciones',
    'Clients CRM': 'Clientes',
    'Catalog': 'Catálogo',
    'Settings': 'Configuración',
    '⚙ Application Settings & Preferences': '⚙ Configuración y preferencias',
    'Loading view...': 'Cargando vista...',
    'Total Revenue': 'Ingresos totales',
    'Pending Balance Due': 'Saldo pendiente',
    'Total Orders': 'Pedidos totales',
    'Total Clients': 'Clientes totales',
    'Catalog Pieces': 'Productos en catálogo',
    'New Order / Quote': 'Nuevo pedido / cotización',
    'Add Client': 'Agregar cliente',
    'Add Furniture Piece': 'Agregar mueble',
    'Recent Orders & Production': 'Pedidos recientes y producción',
    'View All Orders →': 'Ver todos los pedidos →',
    'No orders yet. Click "New Order / Quote" to create your first client order.': 'Aún no hay pedidos. Pulsa «Nuevo pedido / cotización» para crear el primero.',
    'PDF Receipt': 'Recibo PDF',
    'Edit': 'Editar',
    'Delete': 'Eliminar',
    'All': 'Todos',
    'Pending': 'Pendiente',
    'In Production': 'En producción',
    'Delivered': 'Entregado',
    'No orders found': 'No se encontraron pedidos',
    'Create a new furniture order or quote to get started.': 'Crea un pedido o una cotización para comenzar.',
    'Client': 'Cliente',
    'Status': 'Estado',
    'Items': 'Artículos',
    'Total': 'Total',
    'Deposit': 'Anticipo',
    'Balance': 'Saldo',
    'Receipt & Actions': 'Recibo y acciones',
    'Production status': 'Estado de producción',
    'Search by client or order #...': 'Buscar por cliente o n.º de pedido...',
    'Orders & Custom Woodwork Quotes': 'Pedidos y cotizaciones de carpintería',
    'Clients CRM': 'Clientes',
    'No clients found': 'No se encontraron clientes',
    'Add a new client contact to begin tracking orders.': 'Agrega un cliente para comenzar a registrar pedidos.',
    'Search by client name, phone or address...': 'Buscar por nombre, teléfono o dirección...',
    'Add New Client': 'Agregar cliente',
    'Edit Client Profile': 'Editar perfil del cliente',
    'Full Name *': 'Nombre completo *',
    'Phone Number': 'Teléfono',
    'Delivery Address / Location': 'Dirección de entrega / ubicación',
    'Workshop / Preferences Notes': 'Notas y preferencias',
    'Cancel': 'Cancelar',
    'Save Client': 'Guardar cliente',
    'Update Client': 'Actualizar cliente',
    'No phone provided': 'Sin teléfono',
    'No address specified': 'Sin dirección',
    'View Orders': 'Ver pedidos',
    'Total Value:': 'Valor total:',
    'order(s)': 'pedido(s)',
    'Order History for': 'Historial de pedidos de',
    'No orders registered for this client yet.': 'Este cliente aún no tiene pedidos.',
    'Close': 'Cerrar',
    'Product Catalog & Furniture Pieces': 'Catálogo de muebles',
    'Add Furniture Item': 'Agregar mueble',
    'Search catalog by piece name or wood type...': 'Buscar por mueble o tipo de madera...',
    'No products found in this category': 'No se encontraron productos en esta categoría',
    'Add handcrafted products to your catalog to use in quotes and orders.': 'Agrega muebles al catálogo para incluirlos en pedidos y cotizaciones.',
    'Custom crafted solid wood piece.': 'Mueble artesanal de madera maciza.',
    'In Stock': 'En existencia',
    'Built to Order': 'Fabricación bajo pedido',
    'ready)': 'disponibles)',
    'Edit Piece': 'Editar mueble',
    'Delete piece': 'Eliminar mueble',
    'Edit Furniture Piece': 'Editar mueble',
    'Add New Furniture Product': 'Agregar mueble al catálogo',
    'Piece Name *': 'Nombre del mueble *',
    'Category': 'Categoría',
    'Base Price ($) *': 'Precio base ($) *',
    'Stock Ready': 'Unidades disponibles',
    'Dimensions, Wood Species & Finish Details': 'Medidas, tipo de madera y acabado',
    'Update Piece': 'Actualizar mueble',
    'Save to Catalog': 'Guardar en el catálogo',
    'General': 'General',
    'Living Room': 'Sala',
    'Dining Room': 'Comedor',
    'Bedroom': 'Dormitorio',
    'Office': 'Oficina',
    'Custom': 'Personalizado',
    'Application Settings & Preferences': 'Configuración y preferencias',
    'Appearance & Theme': 'Apariencia y tema',
    '☀️ Light Mode': '☀️ Tema claro',
    '🌙 Dark Mode': '🌙 Tema oscuro',
    'Choose your preferred color theme for low-light workshops or bright office environments.': 'Elige un tema claro u oscuro para el taller o la oficina.',
    'Light Mode': 'Tema claro',
    'Dark Mode': 'Tema oscuro',
    'Catalog & Inventory Options': 'Opciones de catálogo e inventario',
    'Control whether stock quantities and ready-count badges are visible to clients and sales agents.': 'Elige si se muestran las existencias en el catálogo.',
    'Show Stock Levels in Catalog': 'Mostrar existencias en el catálogo',
    'When turned off, stock numbers are hidden, presenting items as custom built-to-order pieces.': 'Al desactivarlo, se ocultan las cantidades disponibles.',
    'Device & Network Mode': 'Dispositivo y red',
    'Hardware environment and connectivity status.': 'Entorno de ejecución y estado de conexión.',
    'Runtime Environment': 'Entorno de ejecución',
    'Android Native (Capacitor)': 'Android (Capacitor)',
    'Desktop Browser Web Client': 'Cliente web de escritorio',
    'Local IP Address': 'Dirección IP local',
    'Embedded Server Status': 'Estado del servidor integrado',
    '● Active & Listening': '● Activo y escuchando',
    '○ Standby / Inactive': '○ En espera / inactivo',
    'Database Storage': 'Almacenamiento de datos',
    '📱 Device & Network Mode': '📱 Dispositivo y red',
    '📱 Android Native (Capacitor)': '📱 Android (Capacitor)',
    '💻 Desktop Browser Web Client': '💻 Cliente web de escritorio',
    'SQLite Physical File (furniture.db)': 'Archivo SQLite local (furniture.db)',
    'Loading view': 'Cargando vista',
    'Enable & Show Info': 'Activar y mostrar información',
    'Stop Desktop Access': 'Detener acceso de escritorio',
    'Inactive': 'Inactivo',
    'Desktop Multi-Device Access': 'Acceso desde otros dispositivos',
    'Active': 'Activo',
    'Desktop Client': 'Cliente de escritorio',
    'Connected to Phone Server:': 'Conectado al servidor del teléfono:',
    'Copy Link': 'Copiar enlace',
    'Copy URL': 'Copiar URL',
    'Desktop & Multi-Device Access': 'Acceso de escritorio y otros dispositivos',
    'Open this URL on any laptop, tablet or PC connected to this Wi-Fi network:': 'Abre esta dirección en un equipo conectado a la misma red Wi-Fi:',
    'Starting...': 'Iniciando...',
    'Stopping...': 'Deteniendo...',
    'URL copied to clipboard': 'Dirección copiada',
    'Desktop server stopped': 'Servidor de escritorio detenido',
    'New Order / Quote': 'Nuevo pedido / cotización',
    'Search by client or order #...': 'Buscar por cliente o n.º de pedido...',
    'Create New Furniture Order': 'Crear pedido de muebles',
    'Edit Order': 'Editar pedido',
    'Production Status': 'Estado de producción',
    'Order Line Items *': 'Artículos del pedido *',
    'Add Product / Line Item': 'Agregar producto / artículo',
    'Total Amount ($)': 'Importe total ($)',
    'Deposit Paid ($)': 'Anticipo pagado ($)',
    'Remaining Balance': 'Saldo pendiente',
    '30%': '30%',
    '50%': '50%',
    '100% (Full)': '100% (total)',
    'Create Order & Invoice': 'Crear pedido y factura',
    'Save Changes': 'Guardar cambios',
    'Invoice & Receipt:': 'Factura y recibo:',
    'Official Furniture Receipt Ready': 'El recibo está listo',
    'Download PDF Invoice': 'Descargar factura PDF',
    'Print / Preview': 'Imprimir / vista previa',
    'Done': 'Listo',
    'Client:': 'Cliente:',
    'Deposit:': 'Anticipo:',
    'Balance Due:': 'Saldo pendiente:',
    'Phone:': 'Teléfono:',
    'Address:': 'Dirección:',
    'Notes:': 'Notas:',
    'Search by client name, phone or address...': 'Buscar por nombre, teléfono o dirección...',
    'No orders yet.': 'Aún no hay pedidos.',
    'Error': 'Error',
    'All orders': 'Todos los pedidos',
    'No phone': 'Sin teléfono'
  }
};
const sourceText = new WeakMap();
const sourceAttributes = new WeakMap();

export const i18nService = {
  getLanguage() {
    return settingsService.getSettings().language || 'es';
  },

  text(value) {
    const language = this.getLanguage();
    return translations[language]?.[value] || value;
  },

  translatedValue(value) {
    const language = this.getLanguage();
    const exact = translations[language]?.[value];
    if (exact) return exact;
    if (language === 'es') {
      let match = value.match(/^Order #(.+)$/);
      if (match) return `Pedido n.º ${match[1]}`;
      match = value.match(/^\((\d+) clients\)$/);
      if (match) return `(${match[1]} clientes)`;
      match = value.match(/^\((\d+) items\)$/);
      if (match) return `(${match[1]} productos)`;
      match = value.match(/^\((\d+) orders\)$/);
      if (match) return `(${match[1]} pedidos)`;
      match = value.match(/^● In Stock \((\d+) ready\)$/);
      if (match) return `● En existencia (${match[1]} disponibles)`;
      match = value.match(/^(\d+) item\(s\)$/);
      if (match) return `${match[1]} artículo(s)`;
      match = value.match(/^(\d+) order\(s\)$/);
      if (match) return `${match[1]} pedido(s)`;
    }
    return value;
  },

  apply(root = document) {
    if (!root) return;
    const documentElement = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root.ownerDocument?.documentElement;
    if (documentElement) documentElement.lang = this.getLanguage();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!sourceText.has(node)) sourceText.set(node, node.nodeValue);
      const source = sourceText.get(node);
      const trimmed = source.trim();
      const translated = this.translatedValue(trimmed);
      node.nodeValue = translated === trimmed ? source : source.replace(trimmed, translated);
    }
    root.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach(element => {
      for (const attribute of ['placeholder', 'title', 'aria-label']) {
        let original = sourceAttributes.get(element);
        if (!original) {
          original = {};
          sourceAttributes.set(element, original);
        }
        if (original[attribute] === undefined) original[attribute] = element.getAttribute(attribute);
        const value = original[attribute];
        if (value) element.setAttribute(attribute, this.translatedValue(value));
      }
    });
  }
};
