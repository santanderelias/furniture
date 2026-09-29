import { defineConfig } from 'vite';
import { resolve } from 'path';

function developmentApi() {
  const now = new Date().toISOString();
  let nextClientId = 4;
  let nextOrderId = 4;
  let nextProductId = 7;
  const clients = [
    { id: 1, name: 'Eleanor Vance', phone: '+1 (555) 234-8901', address: '742 Evergreen Terrace', notes: 'Prefers satin clear finish.', created_at: now },
    { id: 2, name: 'Marcus Holloway', phone: '+1 (555) 456-1122', address: '10880 Wilshire Blvd', notes: 'Commercial design client.', created_at: now },
    { id: 3, name: 'Sofia Rodriguez', phone: '+1 (555) 789-3344', address: '415 Mission St', notes: 'Custom apartment remodel.', created_at: now }
  ];
  const products = [
    { id: 1, name: 'Solid Oak Dining Table (6-Seater)', category: 'Dining Room', price: 850, stock: 4, description: 'Handcrafted American white oak table.', created_at: now },
    { id: 2, name: 'Ergonomic Walnut Desk Chair', category: 'Office', price: 320, stock: 10, description: 'Curved steam-bent walnut frame.', created_at: now },
    { id: 3, name: 'Nordic 3-Seater Linen Sofa', category: 'Living Room', price: 1150, stock: 3, description: 'Solid ash frame and linen upholstery.', created_at: now },
    { id: 4, name: 'Reclaimed Timber Coffee Table', category: 'Living Room', price: 280, stock: 6, description: 'Rustic reclaimed pine with steel legs.', created_at: now },
    { id: 5, name: 'King Teak Platform Bed Frame', category: 'Bedroom', price: 1400, stock: 2, description: 'Minimalist mortise-and-tenon teak bed.', created_at: now },
    { id: 6, name: 'Modular Industrial Bookshelf', category: 'Office', price: 490, stock: 5, description: 'Steel frame with solid spruce shelves.', created_at: now }
  ];
  const orders = [
    { id: 1, client_id: 1, status: 'In Production', total_amount: 1130, deposit_amount: 600, items_json: JSON.stringify([{ product_name: products[0].name, quantity: 1, unit_price: 850, subtotal: 850 }, { product_name: products[3].name, quantity: 1, unit_price: 280, subtotal: 280 }]), created_at: now },
    { id: 2, client_id: 2, status: 'Delivered', total_amount: 1280, deposit_amount: 1280, items_json: JSON.stringify([{ product_name: products[1].name, quantity: 4, unit_price: 320, subtotal: 1280 }]), created_at: now },
    { id: 3, client_id: 3, status: 'Pending', total_amount: 1400, deposit_amount: 500, items_json: JSON.stringify([{ product_name: products[4].name, quantity: 1, unit_price: 1400, subtotal: 1400 }]), created_at: now }
  ];

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  const readBody = req => new Promise((resolveBody, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolveBody(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
  const orderWithClient = order => {
    const client = clients.find(item => Number(item.id) === Number(order.client_id));
    return {
      ...order,
      client_name: client?.name ?? null,
      client_phone: client?.phone ?? null,
      client_address: client?.address ?? null
    };
  };
  const stats = () => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const totalDeposits = orders.reduce((sum, order) => sum + Number(order.deposit_amount || 0), 0);
    return {
      totalClients: clients.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(order => order.status === 'Pending').length,
      inProductionOrders: orders.filter(order => order.status === 'In Production').length,
      deliveredOrders: orders.filter(order => order.status === 'Delivered').length,
      totalRevenue,
      totalDeposits,
      pendingBalance: Math.max(0, totalRevenue - totalDeposits)
    };
  };

  const handler = async (req, res, next) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (!pathname.startsWith('/api/')) return next();
    try {
      const method = req.method || 'GET';
      let match;
      if (pathname === '/api/ip' && method === 'GET') return send(res, 200, { ip: '127.0.0.1', port: 5173, active: true, demo: true });
      if (pathname === '/api/stats' && method === 'GET') return send(res, 200, stats());
      if (pathname === '/api/clients' && method === 'GET') return send(res, 200, clients);
      if (pathname === '/api/clients' && method === 'POST') {
        const body = await readBody(req);
        const name = String(body.name || '').trim();
        if (!name) return send(res, 400, { error: 'Client name is required' });
        const client = { id: nextClientId++, name, phone: body.phone || '', address: body.address || '', notes: body.notes || '', created_at: now };
        clients.unshift(client);
        return send(res, 201, { id: client.id, success: true });
      }
      if ((match = pathname.match(/^\/api\/clients\/(\d+)$/))) {
        const index = clients.findIndex(client => Number(client.id) === Number(match[1]));
        if (method === 'GET') return index < 0 ? send(res, 404, { error: 'Client not found' }) : send(res, 200, clients[index]);
        if (method === 'PUT' || method === 'POST') {
          if (index < 0) return send(res, 404, { error: 'Client not found' });
          const body = await readBody(req);
          Object.assign(clients[index], body, { id: clients[index].id });
          return send(res, 200, { success: true });
        }
        if (method === 'DELETE') {
          if (index < 0) return send(res, 200, { success: false });
          clients.splice(index, 1);
          return send(res, 200, { success: true });
        }
      }
      if (pathname === '/api/orders' && method === 'GET') return send(res, 200, orders.map(orderWithClient));
      if (pathname === '/api/orders' && method === 'POST') {
        const body = await readBody(req);
        const order = { id: nextOrderId++, client_id: Number(body.client_id) || null, status: body.status || 'Pending', total_amount: Number(body.total_amount) || 0, deposit_amount: Number(body.deposit_amount) || 0, items_json: typeof body.items_json === 'string' ? body.items_json : JSON.stringify(body.items || []), created_at: now };
        orders.unshift(order);
        return send(res, 201, { id: order.id, success: true });
      }
      if ((match = pathname.match(/^\/api\/orders\/(\d+)\/status$/)) && method === 'PUT') {
        const order = orders.find(item => Number(item.id) === Number(match[1]));
        if (!order) return send(res, 200, { success: false });
        order.status = (await readBody(req)).status || order.status;
        return send(res, 200, { success: true });
      }
      if ((match = pathname.match(/^\/api\/orders\/(\d+)$/))) {
        const index = orders.findIndex(order => Number(order.id) === Number(match[1]));
        if (method === 'GET') return index < 0 ? send(res, 404, { error: 'Order not found' }) : send(res, 200, orderWithClient(orders[index]));
        if (method === 'PUT' || method === 'POST') {
          if (index < 0) return send(res, 404, { error: 'Order not found' });
          const body = await readBody(req);
          Object.assign(orders[index], body, { id: orders[index].id });
          if (Array.isArray(body.items)) orders[index].items_json = JSON.stringify(body.items);
          return send(res, 200, { success: true });
        }
        if (method === 'DELETE') {
          if (index >= 0) orders.splice(index, 1);
          return send(res, 200, { success: index >= 0 });
        }
      }
      if (pathname === '/api/products' && method === 'GET') return send(res, 200, products);
      if (pathname === '/api/products' && method === 'POST') {
        const body = await readBody(req);
        const product = { id: nextProductId++, name: body.name || '', category: body.category || 'General', price: Number(body.price) || 0, stock: Number(body.stock) || 0, description: body.description || '', created_at: now };
        products.push(product);
        return send(res, 201, { id: product.id, success: true });
      }
      if ((match = pathname.match(/^\/api\/products\/(\d+)$/))) {
        const index = products.findIndex(product => Number(product.id) === Number(match[1]));
        if (method === 'GET') return index < 0 ? send(res, 404, { error: 'Product not found' }) : send(res, 200, products[index]);
        if (method === 'PUT' || method === 'POST') {
          if (index < 0) return send(res, 404, { error: 'Product not found' });
          const body = await readBody(req);
          Object.assign(products[index], body, { id: products[index].id });
          return send(res, 200, { success: true });
        }
        if (method === 'DELETE') {
          if (index >= 0) products.splice(index, 1);
          return send(res, 200, { success: index >= 0 });
        }
      }
      return send(res, 404, { error: 'Development API route not found', path: pathname, method });
    } catch (error) {
      return send(res, 400, { error: error.message || 'Invalid development API request' });
    }
  };

  return {
    name: 'furniture-development-api',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); }
  };
}

export default defineConfig({
  root: resolve('src'),
  plugins: [developmentApi()],
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true
  }
});
