package com.furniture.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetManager;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

public class LocalHttpService extends Service {

    public static final String TAG = "LocalHttpService";
    public static final String CHANNEL_ID = "furniture_server_channel";
    public static final int NOTIFICATION_ID = 8080;
    public static final int SERVER_PORT = 8080;

    private static volatile boolean running = false;
    private static volatile String activeIp = "127.0.0.1";

    private FurnitureHttpServer server;
    private DatabaseHelper dbHelper;

    public static boolean isRunning() {
        return running;
    }

    public static String getActiveIp() {
        return activeIp;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        dbHelper = DatabaseHelper.getInstance(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        activeIp = getIpAddress(this);
        createNotificationChannel();

        Notification notification = buildNotification("Desktop Server running at http://" + activeIp + ":" + SERVER_PORT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (server == null) {
            try {
                server = new FurnitureHttpServer(SERVER_PORT, this, dbHelper);
                server.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
                running = true;
                Log.i(TAG, "Embedded HTTP Server successfully started on port " + SERVER_PORT + ", IP: " + activeIp);
            } catch (IOException e) {
                Log.e(TAG, "Failed to start Embedded HTTP Server on port " + SERVER_PORT, e);
                stopSelf();
            }
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (server != null) {
            try {
                server.stop();
                Log.i(TAG, "Embedded HTTP Server stopped.");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping HTTP Server", e);
            }
            server = null;
        }
        running = false;
        stopForeground(true);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Furniture Desktop Server",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background listener for multi-device desktop browser access");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String contentText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        int iconRes = getApplicationInfo().icon != 0 ? getApplicationInfo().icon : android.R.drawable.stat_notify_sync;

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Furniture Desktop Access Active")
                .setContentText(contentText)
                .setSmallIcon(iconRes)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    public static String getIpAddress(Context context) {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            // Priority 1: wireless / ethernet adapters
            for (NetworkInterface intf : interfaces) {
                if (!intf.isUp() || intf.isLoopback()) continue;
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        String ip = addr.getHostAddress();
                        if (ip != null && !ip.startsWith("127.")) {
                            String name = intf.getName().toLowerCase();
                            if (name.contains("wlan") || name.contains("eth") || name.contains("ap") || name.contains("swlan") || name.contains("en")) {
                                return ip;
                            }
                        }
                    }
                }
            }
            // Priority 2: any non-loopback IPv4
            for (NetworkInterface intf : interfaces) {
                if (!intf.isUp() || intf.isLoopback()) continue;
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        String ip = addr.getHostAddress();
                        if (ip != null && !ip.startsWith("127.")) {
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error determining IP address", e);
        }
        return "127.0.0.1";
    }

    // --- EMBEDDED NANOHTTPD SERVER ---

    private static class FurnitureHttpServer extends NanoHTTPD {

        private final Context context;
        private final DatabaseHelper dbHelper;

        public FurnitureHttpServer(int port, Context context, DatabaseHelper dbHelper) {
            super(port);
            this.context = context.getApplicationContext();
            this.dbHelper = dbHelper;
        }

        @Override
        public Response serve(IHTTPSession session) {
            Method method = session.getMethod();
            String uri = session.getUri();

            // Handle preflight CORS request
            if (Method.OPTIONS.equals(method)) {
                Response res = newFixedLengthResponse(Response.Status.OK, "text/plain", "");
                addCorsHeaders(res);
                return res;
            }

            // Route API calls
            if (uri.startsWith("/api")) {
                Response apiResponse = handleApiRequest(session, method, uri);
                addCorsHeaders(apiResponse);
                return apiResponse;
            }

            // Route Static Web Assets (SPA)
            Response staticResponse = handleStaticAsset(uri);
            addCorsHeaders(staticResponse);
            return staticResponse;
        }

        private Response handleApiRequest(IHTTPSession session, Method method, String uri) {
            try {
                // GET /api/ip
                if (uri.equals("/api/ip") && Method.GET.equals(method)) {
                    JSONObject res = new JSONObject();
                    res.put("ip", activeIp);
                    res.put("port", SERVER_PORT);
                    res.put("active", running);
                    return jsonResponse(Response.Status.OK, res.toString());
                }

                // GET /api/stats
                if (uri.equals("/api/stats") && Method.GET.equals(method)) {
                    JSONObject stats = dbHelper.getDashboardStats();
                    return jsonResponse(Response.Status.OK, stats.toString());
                }

                if (uri.equals("/api/export/database") && Method.GET.equals(method)) {
                    File database = dbHelper.getDatabaseFile();
                    ByteArrayOutputStream output = new ByteArrayOutputStream();
                    try (FileInputStream input = new FileInputStream(database)) {
                        byte[] buffer = new byte[8192];
                        int count;
                        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    }
                    byte[] bytes = output.toByteArray();
                    Response response = newFixedLengthResponse(Response.Status.OK, "application/vnd.sqlite3", new ByteArrayInputStream(bytes), bytes.length);
                    response.addHeader("Content-Disposition", "attachment; filename=\"furniture.db\"");
                    return response;
                }

                // Record edit history shared by Android and desktop clients.
                if (uri.matches("^/api/history/(client|order|product)/\\d+$")) {
                    String[] parts = uri.split("/");
                    String entityType = parts[3];
                    long recordId = Long.parseLong(parts[4]);
                    if (Method.GET.equals(method)) {
                        JSONArray history = dbHelper.getRecordHistory(entityType, recordId);
                        return jsonResponse(Response.Status.OK, history.toString());
                    }
                    if (Method.POST.equals(method)) {
                        JSONObject body = new JSONObject(getRequestBody(session));
                        JSONObject snapshot = body.optJSONObject("snapshot");
                        if (snapshot == null) {
                            return jsonResponse(Response.Status.BAD_REQUEST, "{\"error\":\"Snapshot is required\"}");
                        }
                        long revisionId = dbHelper.insertRecordRevision(entityType, recordId, snapshot.toString());
                        JSONObject result = new JSONObject();
                        result.put("id", revisionId);
                        result.put("success", revisionId > 0);
                        return jsonResponse(Response.Status.CREATED, result.toString());
                    }
                }

                // --- CLIENTS API ---
                // GET /api/clients
                if (uri.equals("/api/clients") && Method.GET.equals(method)) {
                    JSONArray clients = dbHelper.getAllClients();
                    return jsonResponse(Response.Status.OK, clients.toString());
                }

                // POST /api/clients
                if (uri.equals("/api/clients") && Method.POST.equals(method)) {
                    String body = getRequestBody(session);
                    JSONObject json = new JSONObject(body);
                    String name = json.optString("name", "").trim();
                    if (name.isEmpty()) {
                        return jsonResponse(Response.Status.BAD_REQUEST, "{\"error\":\"Client name is required\"}");
                    }
                    String phone = json.optString("phone", "");
                    String address = json.optString("address", "");
                    String notes = json.optString("notes", "");

                    long id = dbHelper.insertClient(name, phone, address, notes);
                    JSONObject res = new JSONObject();
                    res.put("id", id);
                    res.put("success", id > 0);
                    return jsonResponse(Response.Status.CREATED, res.toString());
                }

                // /api/clients/{id}
                if (uri.matches("^/api/clients/\\d+$")) {
                    long id = Long.parseLong(uri.substring("/api/clients/".length()));
                    if (Method.GET.equals(method)) {
                        JSONObject client = dbHelper.getClient(id);
                        if (client != null) {
                            return jsonResponse(Response.Status.OK, client.toString());
                        } else {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Client not found\"}");
                        }
                    } else if (Method.PUT.equals(method) || Method.POST.equals(method)) {
                        String body = getRequestBody(session);
                        JSONObject json = new JSONObject(body);
                        JSONObject existing = dbHelper.getClient(id);
                        if (existing == null) {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Client not found\"}");
                        }
                        String name = json.optString("name", existing.optString("name", ""));
                        if (name.trim().isEmpty()) {
                            name = existing.optString("name", "Client #" + id);
                        }
                        String phone = json.has("phone") ? json.optString("phone", "") : existing.optString("phone", "");
                        String address = json.has("address") ? json.optString("address", "") : existing.optString("address", "");
                        String notes = json.has("notes") ? json.optString("notes", "") : existing.optString("notes", "");
                        boolean ok = dbHelper.updateClient(id, name, phone, address, notes);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    } else if (Method.DELETE.equals(method)) {
                        boolean ok = dbHelper.deleteClient(id);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    }
                }

                // --- ORDERS API ---
                // GET /api/orders
                if (uri.equals("/api/orders") && Method.GET.equals(method)) {
                    JSONArray orders = dbHelper.getAllOrders();
                    return jsonResponse(Response.Status.OK, orders.toString());
                }

                // POST /api/orders
                if (uri.equals("/api/orders") && Method.POST.equals(method)) {
                    String body = getRequestBody(session);
                    JSONObject json = new JSONObject(body);
                    long clientId = json.optLong("client_id", 0);
                    String status = json.optString("status", "Pending");
                    double totalAmount = json.optDouble("total_amount", 0.0);
                    double depositAmount = json.optDouble("deposit_amount", 0.0);
                    String itemsJson = json.optString("items_json", "[]");
                    String createdAt = json.optString("created_at", "");
                    String deliveryDate = json.isNull("delivery_date") ? "" : json.optString("delivery_date", "");

                    long id = dbHelper.insertOrder(clientId, status, totalAmount, depositAmount, itemsJson, createdAt, deliveryDate);
                    JSONObject res = new JSONObject();
                    res.put("id", id);
                    res.put("success", id > 0);
                    return jsonResponse(Response.Status.CREATED, res.toString());
                }

                // /api/orders/{id}/status
                if (uri.matches("^/api/orders/\\d+/status$")) {
                    String[] parts = uri.split("/");
                    long id = Long.parseLong(parts[3]);
                    String body = getRequestBody(session);
                    JSONObject json = new JSONObject(body);
                    String newStatus = json.optString("status", "Pending");
                    boolean ok = dbHelper.updateOrderStatus(id, newStatus);
                    JSONObject res = new JSONObject();
                    res.put("success", ok);
                    return jsonResponse(Response.Status.OK, res.toString());
                }

                // /api/orders/{id}
                if (uri.matches("^/api/orders/\\d+$")) {
                    long id = Long.parseLong(uri.substring("/api/orders/".length()));
                    if (Method.GET.equals(method)) {
                        JSONObject order = dbHelper.getOrder(id);
                        if (order != null) {
                            return jsonResponse(Response.Status.OK, order.toString());
                        } else {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Order not found\"}");
                        }
                    } else if (Method.PUT.equals(method) || Method.POST.equals(method)) {
                        String body = getRequestBody(session);
                        JSONObject json = new JSONObject(body);
                        JSONObject existing = dbHelper.getOrder(id);
                        if (existing == null) {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Order not found\"}");
                        }
                        long clientId = json.has("client_id") ? json.optLong("client_id", 0) : existing.optLong("client_id", 0);
                        String status = json.has("status") ? json.optString("status", "Pending") : existing.optString("status", "Pending");
                        double totalAmount = json.has("total_amount") ? json.optDouble("total_amount", 0.0) : existing.optDouble("total_amount", 0.0);
                        double depositAmount = json.has("deposit_amount") ? json.optDouble("deposit_amount", 0.0) : existing.optDouble("deposit_amount", 0.0);
                        String itemsJson = json.has("items_json") ? json.optString("items_json", "[]") : existing.optString("items_json", "[]");
                        String createdAt = json.has("created_at") ? json.optString("created_at", "") : existing.optString("created_at", "");
                        String deliveryDate = json.has("delivery_date")
                            ? (json.isNull("delivery_date") ? "" : json.optString("delivery_date", ""))
                            : (existing.isNull("delivery_date") ? "" : existing.optString("delivery_date", ""));

                        boolean ok = dbHelper.updateOrder(id, clientId, status, totalAmount, depositAmount, itemsJson, createdAt, deliveryDate);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    } else if (Method.DELETE.equals(method)) {
                        boolean ok = dbHelper.deleteOrder(id);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    }
                }

                // --- PRODUCTS API ---
                // GET /api/products
                if (uri.equals("/api/products") && Method.GET.equals(method)) {
                    JSONArray products = dbHelper.getAllProducts();
                    return jsonResponse(Response.Status.OK, products.toString());
                }

                // POST /api/products
                if (uri.equals("/api/products") && Method.POST.equals(method)) {
                    String body = getRequestBody(session);
                    JSONObject json = new JSONObject(body);
                    String name = json.optString("name", "");
                    String category = json.optString("category", "General");
                    double price = json.optDouble("price", 0.0);
                    int stock = json.optInt("stock", 0);
                    String description = json.optString("description", "");

                    long id = dbHelper.insertProduct(name, category, price, stock, description);
                    JSONObject res = new JSONObject();
                    res.put("id", id);
                    res.put("success", id > 0);
                    return jsonResponse(Response.Status.CREATED, res.toString());
                }

                // /api/products/{id}
                if (uri.matches("^/api/products/\\d+$")) {
                    long id = Long.parseLong(uri.substring("/api/products/".length()));
                    if (Method.GET.equals(method)) {
                        JSONObject product = dbHelper.getProduct(id);
                        if (product != null) {
                            return jsonResponse(Response.Status.OK, product.toString());
                        } else {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Product not found\"}");
                        }
                    } else if (Method.PUT.equals(method) || Method.POST.equals(method)) {
                        String body = getRequestBody(session);
                        JSONObject json = new JSONObject(body);
                        JSONObject existing = dbHelper.getProduct(id);
                        if (existing == null) {
                            return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"Product not found\"}");
                        }
                        String name = json.optString("name", existing.optString("name", ""));
                        String category = json.optString("category", existing.optString("category", "General"));
                        double price = json.has("price") ? json.optDouble("price", 0.0) : existing.optDouble("price", 0.0);
                        int stock = json.has("stock") ? json.optInt("stock", 0) : existing.optInt("stock", 0);
                        String description = json.has("description") ? json.optString("description", "") : existing.optString("description", "");

                        boolean ok = dbHelper.updateProduct(id, name, category, price, stock, description);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    } else if (Method.DELETE.equals(method)) {
                        boolean ok = dbHelper.deleteProduct(id);
                        JSONObject res = new JSONObject();
                        res.put("success", ok);
                        return jsonResponse(Response.Status.OK, res.toString());
                    }
                }

                // Fallback for unknown API
                return jsonResponse(Response.Status.NOT_FOUND, "{\"error\":\"API route not found\"}");

            } catch (Exception e) {
                Log.e(TAG, "API execution error on " + uri, e);
                return jsonResponse(Response.Status.INTERNAL_ERROR, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }

        private Response handleStaticAsset(String uri) {
            AssetManager assetManager = context.getAssets();
            String path = uri;

            if (path == null || path.isEmpty() || path.equals("/")) {
                path = "index.html";
            } else if (path.startsWith("/")) {
                path = path.substring(1);
            }

            // Remove query strings if any
            int qIndex = path.indexOf('?');
            if (qIndex != -1) {
                path = path.substring(0, qIndex);
            }

            String fullAssetPath = "public/" + path;

            try {
                InputStream is = assetManager.open(fullAssetPath);
                int size = is.available();
                String mimeType = getMimeType(path);
                return newFixedLengthResponse(Response.Status.OK, mimeType, is, size);
            } catch (IOException e) {
                // For Single Page Application (SPA), fallback to public/index.html
                try {
                    InputStream indexIs = assetManager.open("public/index.html");
                    int size = indexIs.available();
                    return newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", indexIs, size);
                } catch (IOException ex) {
                    Log.e(TAG, "index.html asset missing in assets/public", ex);
                    return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "404 - Web Assets Not Found");
                }
            }
        }

        private String getRequestBody(IHTTPSession session) {
            try {
                Map<String, String> files = new HashMap<>();
                session.parseBody(files);
                if (files.containsKey("postData") && files.get("postData") != null) {
                    return files.get("postData");
                }
                if (files.containsKey("content") && files.get("content") != null) {
                    String contentPath = files.get("content");
                    File file = new File(contentPath);
                    if (file.exists() && file.length() > 0) {
                        try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                            byte[] bytes = new byte[(int) file.length()];
                            int read = fis.read(bytes);
                            if (read > 0) {
                                return new String(bytes, 0, read, StandardCharsets.UTF_8);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not parse body via session.parseBody()", e);
            }
            return "{}";
        }

        private Response jsonResponse(Response.IStatus status, String json) {
            return newFixedLengthResponse(status, "application/json; charset=utf-8", json);
        }

        private void addCorsHeaders(Response response) {
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
            response.addHeader("Access-Control-Max-Age", "86400");
        }

        private String getMimeType(String path) {
            String lower = path.toLowerCase();
            if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
            if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
            if (lower.endsWith(".css")) return "text/css; charset=utf-8";
            if (lower.endsWith(".json")) return "application/json; charset=utf-8";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".woff")) return "font/woff";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".ttf")) return "font/ttf";
            return "application/octet-stream";
        }
    }
}
