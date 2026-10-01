package com.furniture.app;

import android.content.Intent;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "HttpBridge")
public class HttpBridgePlugin extends Plugin {

    private DatabaseHelper dbHelper;

    @Override
    public void load() {
        super.load();
        dbHelper = DatabaseHelper.getInstance(getContext());
    }

    @PluginMethod
    public void startServer(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), LocalHttpService.class);
            ContextCompat.startForegroundService(getContext(), serviceIntent);

            String ip = LocalHttpService.getIpAddress(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("ip", ip);
            ret.put("port", LocalHttpService.SERVER_PORT);
            ret.put("isRunning", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start foreground HTTP server: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), LocalHttpService.class);
            getContext().stopService(serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isRunning", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop foreground HTTP server: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getServerInfo(PluginCall call) {
        try {
            String ip = LocalHttpService.getIpAddress(getContext());
            boolean running = LocalHttpService.isRunning();
            JSObject ret = new JSObject();
            ret.put("ip", ip);
            ret.put("port", LocalHttpService.SERVER_PORT);
            ret.put("isRunning", running);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get server info: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void exportDatabase(PluginCall call) {
        try {
            File database = dbHelper.getDatabaseFile();
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (FileInputStream input = new FileInputStream(database)) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            }
            JSObject result = new JSObject();
            result.put("base64", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not export the SQLite database: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadInvoice(PluginCall call) {
        try {
            byte[] pdfBytes = decodeInvoice(call);
            String fileName = safeInvoiceName(call.getString("fileName", "invoice.pdf"));
            Uri savedUri = saveToDownloads(pdfBytes, fileName, "application/pdf");
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", savedUri.toString());
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not save invoice PDF: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadExport(PluginCall call) {
        try {
            String encoded = call.getString("base64", "");
            if (encoded == null || encoded.isEmpty()) throw new IllegalArgumentException("Export data is empty.");
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            String fileName = safeExportName(call.getString("fileName", "furniture-export.bin"));
            String mimeType = call.getString("mimeType", "application/octet-stream");
            Uri savedUri = saveToDownloads(bytes, fileName, mimeType);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("uri", savedUri.toString());
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not save the export: " + e.getMessage(), e);
        }
    }

    private Uri saveToDownloads(byte[] bytes, String fileName, String mimeType) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Furniture Manager");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri savedUri = getContext().getContentResolver().insert(collection, values);
            if (savedUri == null) throw new IllegalStateException("Android could not create the export in Downloads.");
            try (OutputStream output = getContext().getContentResolver().openOutputStream(savedUri)) {
                if (output == null) throw new IllegalStateException("Could not open the exported file.");
                output.write(bytes);
            } catch (Exception e) {
                getContext().getContentResolver().delete(savedUri, null, null);
                throw e;
            }
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.Downloads.IS_PENDING, 0);
            getContext().getContentResolver().update(savedUri, ready, null, null);
            return savedUri;
        }

        File downloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloads == null) downloads = getContext().getCacheDir();
        if (!downloads.exists() && !downloads.mkdirs()) throw new IllegalStateException("Could not create the download folder.");
        File outputFile = new File(downloads, fileName);
        try (FileOutputStream output = new FileOutputStream(outputFile)) {
            output.write(bytes);
        }
        return Uri.fromFile(outputFile);
    }

    @PluginMethod
    public void openInvoice(PluginCall call) {
        try {
            File pdf = writeInvoiceToCache(call);
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pdf);
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, "application/pdf");
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(Intent.createChooser(view, "Open or print invoice"));
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("fileName", pdf.getName());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not open the invoice. Install a PDF viewer and try again: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void printInvoice(PluginCall call) {
        try {
            File pdf = writeInvoiceToCache(call);
            PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) throw new IllegalStateException("Android printing is unavailable on this device.");
            printManager.print(pdf.getName(), new InvoicePrintAdapter(pdf), new PrintAttributes.Builder().build());
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not start invoice printing: " + e.getMessage(), e);
        }
    }

    private byte[] decodeInvoice(PluginCall call) {
        String encoded = call.getString("base64", "");
        if (encoded == null || encoded.trim().isEmpty()) throw new IllegalArgumentException("Invoice PDF data is empty.");
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        if (bytes.length == 0) throw new IllegalArgumentException("Invoice PDF data is empty.");
        return bytes;
    }

    private String safeInvoiceName(String name) {
        String safe = name == null ? "invoice.pdf" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (!safe.toLowerCase().endsWith(".pdf")) safe += ".pdf";
        return safe;
    }

    private String safeExportName(String name) {
        String safe = name == null ? "furniture-export.bin" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        return safe.isEmpty() ? "furniture-export.bin" : safe;
    }

    private File writeInvoiceToCache(PluginCall call) throws Exception {
        File directory = new File(getContext().getCacheDir(), "invoices");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Could not create invoice cache.");
        File pdf = new File(directory, safeInvoiceName(call.getString("fileName", "invoice.pdf")));
        try (FileOutputStream output = new FileOutputStream(pdf)) {
            output.write(decodeInvoice(call));
        }
        return pdf;
    }

    private static final class InvoicePrintAdapter extends PrintDocumentAdapter {
        private final File pdfFile;

        InvoicePrintAdapter(File pdfFile) {
            this.pdfFile = pdfFile;
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                             CancellationSignal cancellationSignal, LayoutResultCallback callback,
                             Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            PrintDocumentInfo info = new PrintDocumentInfo.Builder(pdfFile.getName())
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                    .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                    .build();
            callback.onLayoutFinished(info, true);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                            CancellationSignal cancellationSignal, WriteResultCallback callback) {
            try (FileInputStream input = new FileInputStream(pdfFile);
                 FileOutputStream output = new FileOutputStream(destination.getFileDescriptor())) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) > 0) {
                    if (cancellationSignal.isCanceled()) {
                        callback.onWriteCancelled();
                        return;
                    }
                    output.write(buffer, 0, count);
                }
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            } catch (Exception e) {
                callback.onWriteFailed(e.getMessage());
            }
        }
    }

    private Long parseId(PluginCall call, String name) {
        if (!call.getData().has(name) || call.getData().isNull(name)) {
            return null;
        }
        long val = call.getData().optLong(name, -1L);
        return val > 0 ? val : null;
    }

    private long requireId(PluginCall call, String name) {
        if (!call.getData().has(name) || call.getData().isNull(name)) {
            return -1L;
        }
        return call.getData().optLong(name, -1L);
    }

    // --- CLIENTS DB OPERATIONS ---

    @PluginMethod
    public void getClients(PluginCall call) {
        try {
            JSONArray clients = dbHelper.getAllClients();
            JSObject ret = new JSObject();
            ret.put("clients", new JSArray(clients.toString()));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error fetching clients: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void saveClient(PluginCall call) {
        try {
            Long id = parseId(call, "id");
            String name = call.getString("name", "");
            if (name == null || name.trim().isEmpty()) {
                call.reject("Client name is required.");
                return;
            }
            name = name.trim();
            String phone = call.getString("phone", "");
            String address = call.getString("address", "");
            String notes = call.getString("notes", "");

            JSObject ret = new JSObject();
            if (id == null || id <= 0) {
                long newId = dbHelper.insertClient(name, phone, address, notes);
                ret.put("id", newId);
                ret.put("success", newId > 0);
            } else {
                boolean ok = dbHelper.updateClient(id, name, phone, address, notes);
                ret.put("id", id);
                ret.put("success", ok);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error saving client: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteClient(PluginCall call) {
        try {
            long id = requireId(call, "id");
            boolean ok = dbHelper.deleteClient(id);
            JSObject ret = new JSObject();
            ret.put("success", ok);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error deleting client: " + e.getMessage(), e);
        }
    }

    // --- ORDERS DB OPERATIONS ---

    @PluginMethod
    public void getOrders(PluginCall call) {
        try {
            JSONArray orders = dbHelper.getAllOrders();
            JSObject ret = new JSObject();
            ret.put("orders", new JSArray(orders.toString()));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error fetching orders: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void saveOrder(PluginCall call) {
        try {
            Long id = parseId(call, "id");
            long clientId = requireId(call, "client_id");
            String status = call.getString("status", "Pending");
            double totalAmount = call.getDouble("total_amount", 0.0);
            double depositAmount = call.getDouble("deposit_amount", 0.0);
            String itemsJson = call.getString("items_json", "[]");
            String createdAt = call.getString("created_at", "");
            String deliveryDate = call.getString("delivery_date", "");

            JSObject ret = new JSObject();
            if (id == null || id <= 0) {
                long newId = dbHelper.insertOrder(clientId, status, totalAmount, depositAmount, itemsJson, createdAt, deliveryDate);
                ret.put("id", newId);
                ret.put("success", newId > 0);
            } else {
                boolean ok = dbHelper.updateOrder(id, clientId, status, totalAmount, depositAmount, itemsJson, createdAt, deliveryDate);
                ret.put("id", id);
                ret.put("success", ok);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error saving order: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void updateOrderStatus(PluginCall call) {
        try {
            long id = requireId(call, "id");
            String status = call.getString("status", "Pending");
            boolean ok = dbHelper.updateOrderStatus(id, status);
            JSObject ret = new JSObject();
            ret.put("success", ok);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error updating order status: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteOrder(PluginCall call) {
        try {
            long id = requireId(call, "id");
            boolean ok = dbHelper.deleteOrder(id);
            JSObject ret = new JSObject();
            ret.put("success", ok);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error deleting order: " + e.getMessage(), e);
        }
    }

    // --- PRODUCTS DB OPERATIONS ---

    @PluginMethod
    public void getProducts(PluginCall call) {
        try {
            JSONArray products = dbHelper.getAllProducts();
            JSObject ret = new JSObject();
            ret.put("products", new JSArray(products.toString()));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error fetching products: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void saveProduct(PluginCall call) {
        try {
            Long id = parseId(call, "id");
            String name = call.getString("name", "");
            String category = call.getString("category", "General");
            double price = call.getDouble("price", 0.0);
            int stock = call.getInt("stock", 0);
            String description = call.getString("description", "");

            JSObject ret = new JSObject();
            if (id == null || id <= 0) {
                long newId = dbHelper.insertProduct(name, category, price, stock, description);
                ret.put("id", newId);
                ret.put("success", newId > 0);
            } else {
                boolean ok = dbHelper.updateProduct(id, name, category, price, stock, description);
                ret.put("id", id);
                ret.put("success", ok);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error saving product: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteProduct(PluginCall call) {
        try {
            long id = requireId(call, "id");
            boolean ok = dbHelper.deleteProduct(id);
            JSObject ret = new JSObject();
            ret.put("success", ok);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error deleting product: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getRecordHistory(PluginCall call) {
        try {
            String entityType = call.getString("entityType", "");
            long recordId = requireId(call, "recordId");
            if (!isValidHistoryType(entityType) || recordId <= 0) {
                call.reject("Invalid record history request.");
                return;
            }
            JSONArray history = dbHelper.getRecordHistory(entityType, recordId);
            JSObject result = new JSObject();
            result.put("history", new JSArray(history.toString()));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error fetching record history: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void recordRevision(PluginCall call) {
        try {
            String entityType = call.getString("entityType", "");
            long recordId = requireId(call, "recordId");
            JSONObject snapshot = call.getData().optJSONObject("snapshot");
            if (!isValidHistoryType(entityType) || recordId <= 0 || snapshot == null) {
                call.reject("Invalid record revision.");
                return;
            }
            long revisionId = dbHelper.insertRecordRevision(entityType, recordId, snapshot.toString());
            JSObject result = new JSObject();
            result.put("success", revisionId > 0);
            result.put("id", revisionId);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error saving record revision: " + e.getMessage(), e);
        }
    }

    private boolean isValidHistoryType(String entityType) {
        return "client".equals(entityType) || "order".equals(entityType) || "product".equals(entityType);
    }

    // --- STATS DB OPERATIONS ---

    @PluginMethod
    public void getStats(PluginCall call) {
        try {
            JSONObject stats = dbHelper.getDashboardStats();
            call.resolve(new JSObject(stats.toString()));
        } catch (Exception e) {
            call.reject("Error fetching stats: " + e.getMessage(), e);
        }
    }
}
