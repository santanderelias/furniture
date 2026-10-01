// Data Service supporting dual execution modes:
// 1. Native Mode (Inside Capacitor Android WebView): Calls Capacitor HttpBridgePlugin / local SQLite
// 2. Desktop Browser Mode (Loaded via http://<phone-ip>:8080): Relative REST API endpoints /api/*

export const isNativePlatform = () => {
  return typeof window !== 'undefined' && 
         Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
};

const getPlugin = () => {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins) {
    return window.Capacitor.Plugins.HttpBridge;
  }
  return null;
};

// Base URL for API requests when in browser mode
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  return ''; // Relative URLs hit the same origin (http://<ip>:8080)
};

export const dataService = {
  // --- SERVER LIFECYCLE CONTROLS ---

  async getServerInfo() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getServerInfo) {
      try {
        return await plugin.getServerInfo();
      } catch (e) {
        console.warn('Native getServerInfo failed, falling back to HTTP API:', e);
      }
    }
    // Browser mode: query /api/ip
    try {
      const res = await fetch(`${getApiBase()}/api/ip`);
      if (res.ok) {
        const data = await res.json();
        return {
          ip: data.ip,
          port: data.port,
          isRunning: data.active
        };
      }
    } catch (e) {
      // Offline or server not responding
    }
    return {
      ip: window.location.hostname || '127.0.0.1',
      port: 8080,
      isRunning: !isNativePlatform() // If desktop browser loaded the page, server is running
    };
  },

  async startServer() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.startServer) {
      return await plugin.startServer();
    }
    throw new Error('Server lifecycle can only be managed from the host Android device.');
  },

  async stopServer() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.stopServer) {
      return await plugin.stopServer();
    }
    throw new Error('Server lifecycle can only be managed from the host Android device.');
  },

  async downloadInvoice(base64, fileName) {
    const plugin = getPlugin();
    if (!isNativePlatform() || !plugin?.downloadInvoice) return null;
    return await plugin.downloadInvoice({ base64, fileName });
  },

  async openInvoice(base64, fileName) {
    const plugin = getPlugin();
    if (!isNativePlatform() || !plugin?.openInvoice) return null;
    return await plugin.openInvoice({ base64, fileName });
  },

  async printInvoice(base64, fileName) {
    const plugin = getPlugin();
    if (!isNativePlatform() || !plugin?.printInvoice) return null;
    return await plugin.printInvoice({ base64, fileName });
  },

  async exportDatabase() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.exportDatabase) {
      const result = await plugin.exportDatabase();
      if (!result?.base64) throw new Error('The SQLite database export was empty.');
      const bytes = Uint8Array.from(atob(result.base64), character => character.charCodeAt(0));
      return new Blob([bytes], { type: 'application/vnd.sqlite3' });
    }
    const res = await fetch(`${getApiBase()}/api/export/database`);
    if (!res.ok) throw new Error('Raw SQLite export is available from the Android embedded server.');
    return await res.blob();
  },

  async downloadExport(base64, fileName, mimeType) {
    const plugin = getPlugin();
    if (!isNativePlatform() || !plugin?.downloadExport) return null;
    const result = await plugin.downloadExport({ base64, fileName, mimeType });
    if (result?.success === false) throw new Error('Android could not save the export.');
    return result;
  },

  // --- STATS ---

  async getStats() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getStats) {
      try {
        return await plugin.getStats();
      } catch (e) {
        console.warn('Plugin getStats failed, fallback to /api/stats', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  },

  async getRecordHistory(entityType, recordId) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getRecordHistory) {
      const result = await plugin.getRecordHistory({ entityType, recordId: Number(recordId) });
      return (result.history || []).map(revision => ({
        timestamp: revision.created_at,
        snapshot: JSON.parse(revision.snapshot_json)
      }));
    }
    const res = await fetch(`${getApiBase()}/api/history/${entityType}/${recordId}`);
    if (!res.ok) throw new Error('Failed to fetch record history');
    return (await res.json()).map(revision => ({
      timestamp: revision.created_at,
      snapshot: JSON.parse(revision.snapshot_json)
    }));
  },

  async recordRevision(entityType, recordId, snapshot) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.recordRevision) {
      const result = await plugin.recordRevision({ entityType, recordId: Number(recordId), snapshot });
      if (result?.success === false) throw new Error('Could not save record history');
      return result;
    }
    const res = await fetch(`${getApiBase()}/api/history/${entityType}/${recordId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error('Failed to save record history');
    return await res.json();
  },

  // --- CLIENTS CRM ---

  async getClients() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getClients) {
      try {
        const ret = await plugin.getClients();
        return ret.clients || [];
      } catch (e) {
        console.warn('Plugin getClients failed, fallback to /api/clients', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/clients`);
    if (!res.ok) throw new Error('Failed to fetch clients');
    return await res.json();
  },

  async getClient(id) {
    const clients = await this.getClients();
    return clients.find(c => Number(c.id) === Number(id)) || null;
  },

  async saveClient(clientData) {
    const name = String(clientData.name || '').trim();
    if (!name) throw new Error('Client name is required.');

    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.saveClient) {
      const result = await plugin.saveClient({
        id: clientData.id !== undefined && clientData.id !== null && clientData.id !== '' ? Number(clientData.id) : null,
        name,
        phone: clientData.phone || '',
        address: clientData.address || '',
        notes: clientData.notes || ''
      });
      if (result?.success === false) throw new Error('Native database did not save the client.');
      return result;
    }

    const isUpdate = Boolean(clientData.id);
    const url = isUpdate ? `${getApiBase()}/api/clients/${clientData.id}` : `${getApiBase()}/api/clients`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Failed to save client (${res.status})`);
    }
    return await res.json();
  },

  async deleteClient(id) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.deleteClient) {
      try {
        return await plugin.deleteClient({ id: Number(id) });
      } catch (e) {
        console.warn('Plugin deleteClient failed, fallback to /api/clients', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete client');
    return await res.json();
  },

  // --- ORDERS MANAGEMENT ---

  async getOrders() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getOrders) {
      try {
        const ret = await plugin.getOrders();
        return (ret.orders || []).map(this.normalizeOrder);
      } catch (e) {
        console.warn('Plugin getOrders failed, fallback to /api/orders', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/orders`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();
    return (orders || []).map(this.normalizeOrder);
  },

  normalizeOrder(order) {
    let items = [];
    if (order.items_json) {
      try {
        items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json;
      } catch (e) {
        items = [];
      }
    }
    return {
      ...order,
      items,
      total_amount: Number(order.total_amount) || 0,
      deposit_amount: Number(order.deposit_amount) || 0,
      balance_due: Math.max(0, (Number(order.total_amount) || 0) - (Number(order.deposit_amount) || 0))
    };
  },

  async saveOrder(orderData) {
    const payload = {
      id: orderData.id ? Number(orderData.id) : null,
      client_id: Number(orderData.client_id) || 0,
      status: orderData.status || 'Pending',
      total_amount: Number(orderData.total_amount) || 0,
      deposit_amount: Number(orderData.deposit_amount) || 0,
      created_at: orderData.created_at || '',
      delivery_date: orderData.delivery_date || '',
      items_json: typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || [])
    };

    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.saveOrder) {
      try {
        return await plugin.saveOrder(payload);
      } catch (e) {
        console.warn('Plugin saveOrder failed, fallback to /api/orders', e);
      }
    }

    const isUpdate = Boolean(orderData.id);
    const url = isUpdate ? `${getApiBase()}/api/orders/${orderData.id}` : `${getApiBase()}/api/orders`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save order');
    return await res.json();
  },

  async updateOrderStatus(id, status) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.updateOrderStatus) {
      try {
        return await plugin.updateOrderStatus({ id: Number(id), status });
      } catch (e) {
        console.warn('Plugin updateOrderStatus failed, fallback to /api', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return await res.json();
  },

  async deleteOrder(id) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.deleteOrder) {
      try {
        return await plugin.deleteOrder({ id: Number(id) });
      } catch (e) {
        console.warn('Plugin deleteOrder failed, fallback to /api', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete order');
    return await res.json();
  },

  // --- PRODUCTS CATALOG ---

  async getProducts() {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.getProducts) {
      try {
        const ret = await plugin.getProducts();
        return ret.products || [];
      } catch (e) {
        console.warn('Plugin getProducts failed, fallback to /api/products', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  },

  async saveProduct(prod) {
    const payload = {
      id: prod.id ? Number(prod.id) : null,
      name: prod.name,
      category: prod.category || 'General',
      price: Number(prod.price) || 0,
      stock: Number(prod.stock) || 0,
      description: prod.description || ''
    };

    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.saveProduct) {
      try {
        return await plugin.saveProduct(payload);
      } catch (e) {
        console.warn('Plugin saveProduct failed, fallback to /api/products', e);
      }
    }

    const isUpdate = Boolean(prod.id);
    const url = isUpdate ? `${getApiBase()}/api/products/${prod.id}` : `${getApiBase()}/api/products`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save product');
    return await res.json();
  },

  async deleteProduct(id) {
    const plugin = getPlugin();
    if (isNativePlatform() && plugin?.deleteProduct) {
      try {
        return await plugin.deleteProduct({ id: Number(id) });
      } catch (e) {
        console.warn('Plugin deleteProduct failed, fallback to /api/products', e);
      }
    }
    const res = await fetch(`${getApiBase()}/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
    return await res.json();
  }
};
