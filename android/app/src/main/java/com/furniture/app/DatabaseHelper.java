package com.furniture.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String TAG = "DatabaseHelper";
    private static final String DATABASE_NAME = "furniture.db";
    private static final int DATABASE_VERSION = 4;

    private static DatabaseHelper instance;

    public static synchronized DatabaseHelper getInstance(Context context) {
        if (instance == null) {
            instance = new DatabaseHelper(context.getApplicationContext());
        }
        return instance;
    }

    public DatabaseHelper(Context context) {
        // Physical SQLite database stored locally at context.getFilesDir() + "/furniture.db"
        super(context, new File(context.getFilesDir(), DATABASE_NAME).getAbsolutePath(), null, DATABASE_VERSION);
    }

    public File getDatabaseFile() {
        SQLiteDatabase db = getWritableDatabase();
        Cursor checkpoint = db.rawQuery("PRAGMA wal_checkpoint(FULL)", null);
        checkpoint.moveToFirst();
        checkpoint.close();
        return new File(db.getPath());
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        Log.i(TAG, "Creating SQLite tables in furniture.db");

        // Clients table
        db.execSQL("CREATE TABLE IF NOT EXISTS clients (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "name TEXT NOT NULL, " +
                "phone TEXT, " +
                "address TEXT, " +
                "notes TEXT, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                ");");

        // Orders table
        db.execSQL("CREATE TABLE IF NOT EXISTS orders (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "client_id INTEGER, " +
                "status TEXT DEFAULT 'Pending', " +
                "total_amount REAL, " +
                "deposit_amount REAL, " +
                "items_json TEXT, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                "delivery_date TEXT, " +
                "added_at TIMESTAMP, " +
                "updated_at TIMESTAMP, " +
                "FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL" +
                ");");

        // Products table for furniture catalog
        db.execSQL("CREATE TABLE IF NOT EXISTS products (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "name TEXT NOT NULL, " +
                "category TEXT, " +
                "price REAL NOT NULL, " +
                "stock INTEGER DEFAULT 0, " +
                "description TEXT, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                ");");

            createRecordHistoryTable(db);

        // Seed initial furniture business data
        seedInitialData(db);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) createRecordHistoryTable(db);
        if (oldVersion < 3) db.execSQL("ALTER TABLE orders ADD COLUMN delivery_date TEXT");
        if (oldVersion < 4) {
            db.execSQL("ALTER TABLE orders ADD COLUMN added_at TIMESTAMP");
            db.execSQL("ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP");
            db.execSQL("UPDATE orders SET added_at = created_at, updated_at = created_at");
        }
    }

    private void createRecordHistoryTable(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS record_history (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "entity_type TEXT NOT NULL, " +
                "record_id INTEGER NOT NULL, " +
                "snapshot_json TEXT NOT NULL, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                ");");
        db.execSQL("CREATE INDEX IF NOT EXISTS record_history_lookup ON record_history(entity_type, record_id, id DESC)");
    }

    private void seedInitialData(SQLiteDatabase db) {
        try {
            // Seed Products
            db.execSQL("INSERT INTO products (name, category, price, stock, description) VALUES " +
                    "('Solid Oak Dining Table (6-Seater)', 'Dining Room', 850.00, 4, 'Handcrafted American white oak table with matte protective polyurethane coat.'), " +
                    "('Ergonomic Walnut Desk Chair', 'Office', 320.00, 10, 'Curved steam-bent walnut frame with full-grain black leather cushioning.'), " +
                    "('Nordic 3-Seater Linen Sofa', 'Living Room', 1150.00, 3, 'Solid ash frame, high-resilience foam, textured stain-resistant oatmeal linen.'), " +
                    "('Reclaimed Timber Coffee Table', 'Living Room', 280.00, 6, 'Rustic reclaimed pine beam table with raw industrial steel hairpin legs.'), " +
                    "('King Teak Platform Bed Frame', 'Bedroom', 1400.00, 2, 'Minimalist Japanese-style mortise-and-tenon teak bed with integrated nightstands.'), " +
                    "('Modular Industrial Bookshelf', 'Office', 490.00, 5, '5-tier black powder-coated steel frame with distressed solid spruce shelves.');");

            // Seed Clients
            db.execSQL("INSERT INTO clients (name, phone, address, notes) VALUES " +
                    "('Eleanor Vance', '+1 (555) 234-8901', '742 Evergreen Terr, Springfield', 'Prefers satin clear finish. Delivery preferred on Saturday morning.'), " +
                    "('Marcus Holloway', '+1 (555) 456-1122', '10880 Wilshire Blvd, Ste 400, Los Angeles', 'Commercial design client. Require itemized tax receipts for accounting.'), " +
                    "('Sofia Rodriguez', '+1 (555) 789-3344', '415 Mission St, San Francisco', 'Custom apartment remodel. Color palette: earthy tones & natural woods.');");

            // Seed Orders with JSON items array
            String itemsOrder1 = "[{\"product_name\":\"Solid Oak Dining Table (6-Seater)\",\"quantity\":1,\"unit_price\":850.00,\"subtotal\":850.00},{\"product_name\":\"Reclaimed Timber Coffee Table\",\"quantity\":1,\"unit_price\":280.00,\"subtotal\":280.00}]";
            String itemsOrder2 = "[{\"product_name\":\"Ergonomic Walnut Desk Chair\",\"quantity\":4,\"unit_price\":320.00,\"subtotal\":1280.00}]";
            String itemsOrder3 = "[{\"product_name\":\"King Teak Platform Bed Frame\",\"quantity\":1,\"unit_price\":1400.00,\"subtotal\":1400.00}]";

            ContentValues cv1 = new ContentValues();
            cv1.put("added_at", currentTimestamp());
            cv1.put("updated_at", currentTimestamp());
            cv1.put("client_id", 1);
            cv1.put("status", "In Production");
            cv1.put("total_amount", 1130.00);
            cv1.put("deposit_amount", 600.00);
            cv1.put("items_json", itemsOrder1);
            db.insert("orders", null, cv1);

            ContentValues cv2 = new ContentValues();
            cv2.put("added_at", currentTimestamp());
            cv2.put("updated_at", currentTimestamp());
            cv2.put("client_id", 2);
            cv2.put("status", "Delivered");
            cv2.put("total_amount", 1280.00);
            cv2.put("deposit_amount", 1280.00);
            cv2.put("items_json", itemsOrder2);
            db.insert("orders", null, cv2);

            ContentValues cv3 = new ContentValues();
            cv3.put("added_at", currentTimestamp());
            cv3.put("updated_at", currentTimestamp());
            cv3.put("client_id", 3);
            cv3.put("status", "Pending");
            cv3.put("total_amount", 1400.00);
            cv3.put("deposit_amount", 500.00);
            cv3.put("items_json", itemsOrder3);
            db.insert("orders", null, cv3);

            Log.i(TAG, "Database seeded successfully with initial clients, products, and orders.");
        } catch (Exception e) {
            Log.e(TAG, "Error seeding initial database data", e);
        }
    }

    // --- CLIENTS CRUD ---

    public JSONArray getAllClients() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM clients ORDER BY id DESC", null);
        JSONArray result = cursorToJsonArray(cursor);
        cursor.close();
        return result;
    }

    public JSONObject getClient(long id) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM clients WHERE id = ?", new String[]{String.valueOf(id)});
        JSONObject result = cursorToOneJsonObject(cursor);
        cursor.close();
        return result;
    }

    public long insertClient(String name, String phone, String address, String notes) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("name", name);
        cv.put("phone", phone);
        cv.put("address", address);
        cv.put("notes", notes);
        return db.insert("clients", null, cv);
    }

    public boolean updateClient(long id, String name, String phone, String address, String notes) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("name", name);
        cv.put("phone", phone);
        cv.put("address", address);
        cv.put("notes", notes);
        return db.update("clients", cv, "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    public boolean deleteClient(long id) {
        SQLiteDatabase db = getWritableDatabase();
        return db.delete("clients", "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    // --- ORDERS CRUD ---

    public JSONArray getAllOrders() {
        SQLiteDatabase db = getReadableDatabase();
        String query = "SELECT o.*, c.name AS client_name, c.phone AS client_phone, c.address AS client_address " +
                "FROM orders o " +
            "LEFT JOIN clients c ON o.client_id = c.id";
        Cursor cursor = db.rawQuery(query, null);
        JSONArray result = cursorToJsonArray(cursor);
        cursor.close();
        return result;
    }

    public JSONObject getOrder(long id) {
        SQLiteDatabase db = getReadableDatabase();
        String query = "SELECT o.*, c.name AS client_name, c.phone AS client_phone, c.address AS client_address " +
                "FROM orders o " +
                "LEFT JOIN clients c ON o.client_id = c.id " +
                "WHERE o.id = ?";
        Cursor cursor = db.rawQuery(query, new String[]{String.valueOf(id)});
        JSONObject result = cursorToOneJsonObject(cursor);
        cursor.close();
        return result;
    }

    public long insertOrder(long clientId, String status, double totalAmount, double depositAmount, String itemsJson, String createdAt, String deliveryDate) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        if (clientId > 0) {
            cv.put("client_id", clientId);
        }
        cv.put("status", status != null ? status : "Pending");
        cv.put("total_amount", totalAmount);
        cv.put("deposit_amount", depositAmount);
        cv.put("items_json", itemsJson);
        if (createdAt != null && !createdAt.trim().isEmpty()) cv.put("created_at", createdAt);
        if (deliveryDate == null || deliveryDate.trim().isEmpty()) cv.putNull("delivery_date");
        else cv.put("delivery_date", deliveryDate);
        cv.put("added_at", currentTimestamp());
        cv.put("updated_at", currentTimestamp());
        return db.insert("orders", null, cv);
    }

    public boolean updateOrder(long id, long clientId, String status, double totalAmount, double depositAmount, String itemsJson, String createdAt, String deliveryDate) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        if (clientId > 0) {
            cv.put("client_id", clientId);
        }
        if (status != null) {
            cv.put("status", status);
        }
        cv.put("total_amount", totalAmount);
        cv.put("deposit_amount", depositAmount);
        if (itemsJson != null) {
            cv.put("items_json", itemsJson);
        }
        if (createdAt != null && !createdAt.trim().isEmpty()) cv.put("created_at", createdAt);
        if (deliveryDate == null || deliveryDate.trim().isEmpty()) cv.putNull("delivery_date");
        else cv.put("delivery_date", deliveryDate);
        cv.put("updated_at", currentTimestamp());
        return db.update("orders", cv, "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    public boolean updateOrderStatus(long id, String status) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("status", status);
        cv.put("updated_at", currentTimestamp());
        return db.update("orders", cv, "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    public boolean deleteOrder(long id) {
        SQLiteDatabase db = getWritableDatabase();
        return db.delete("orders", "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    private String currentTimestamp() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
    }

    // --- PRODUCTS CRUD ---

    public JSONArray getAllProducts() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM products ORDER BY name ASC", null);
        JSONArray result = cursorToJsonArray(cursor);
        cursor.close();
        return result;
    }

    public JSONObject getProduct(long id) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM products WHERE id = ?", new String[]{String.valueOf(id)});
        JSONObject result = cursorToOneJsonObject(cursor);
        cursor.close();
        return result;
    }

    public long insertProduct(String name, String category, double price, int stock, String description) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("name", name);
        cv.put("category", category);
        cv.put("price", price);
        cv.put("stock", stock);
        cv.put("description", description);
        return db.insert("products", null, cv);
    }

    public boolean updateProduct(long id, String name, String category, double price, int stock, String description) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("name", name);
        cv.put("category", category);
        cv.put("price", price);
        cv.put("stock", stock);
        cv.put("description", description);
        return db.update("products", cv, "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    public boolean deleteProduct(long id) {
        SQLiteDatabase db = getWritableDatabase();
        return db.delete("products", "id = ?", new String[]{String.valueOf(id)}) > 0;
    }

    // --- DASHBOARD STATS ---

    public JSONObject getDashboardStats() {
        SQLiteDatabase db = getReadableDatabase();
        JSONObject stats = new JSONObject();
        try {
            // Client count
            Cursor curClients = db.rawQuery("SELECT COUNT(*) FROM clients", null);
            int totalClients = 0;
            if (curClients.moveToFirst()) totalClients = curClients.getInt(0);
            curClients.close();

            // Product count
            Cursor curProducts = db.rawQuery("SELECT COUNT(*) FROM products", null);
            int totalProducts = 0;
            if (curProducts.moveToFirst()) totalProducts = curProducts.getInt(0);
            curProducts.close();

            // Orders stats
            Cursor curOrders = db.rawQuery("SELECT " +
                    "COUNT(*) AS total_orders, " +
                    "SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders, " +
                    "SUM(CASE WHEN status = 'In Production' THEN 1 ELSE 0 END) AS production_orders, " +
                    "SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders, " +
                    "SUM(total_amount) AS total_revenue, " +
                    "SUM(deposit_amount) AS total_deposits " +
                    "FROM orders", null);

            int totalOrders = 0;
            int pendingOrders = 0;
            int inProductionOrders = 0;
            int deliveredOrders = 0;
            double totalRevenue = 0.0;
            double totalDeposits = 0.0;

            if (curOrders.moveToFirst()) {
                totalOrders = curOrders.getInt(0);
                pendingOrders = curOrders.getInt(1);
                inProductionOrders = curOrders.getInt(2);
                deliveredOrders = curOrders.getInt(3);
                totalRevenue = curOrders.getDouble(4);
                totalDeposits = curOrders.getDouble(5);
            }
            curOrders.close();

            stats.put("totalClients", totalClients);
            stats.put("totalProducts", totalProducts);
            stats.put("totalOrders", totalOrders);
            stats.put("pendingOrders", pendingOrders);
            stats.put("inProductionOrders", inProductionOrders);
            stats.put("deliveredOrders", deliveredOrders);
            stats.put("totalRevenue", totalRevenue);
            stats.put("totalDeposits", totalDeposits);
            stats.put("pendingBalance", Math.max(0, totalRevenue - totalDeposits));
        } catch (JSONException e) {
            Log.e(TAG, "Error calculating dashboard stats", e);
        }
        return stats;
    }

    // --- RAW QUERY / EXEC HELPER ---

    public JSONArray rawQuery(String sql, String[] selectionArgs) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery(sql, selectionArgs);
        JSONArray result = cursorToJsonArray(cursor);
        cursor.close();
        return result;
    }

    public JSONArray getRecordHistory(String entityType, long recordId) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT id, entity_type, record_id, snapshot_json, created_at " +
                "FROM record_history WHERE entity_type = ? AND record_id = ? ORDER BY id DESC LIMIT 50",
                new String[]{entityType, String.valueOf(recordId)});
        JSONArray result = cursorToJsonArray(cursor);
        cursor.close();
        return result;
    }

    public long insertRecordRevision(String entityType, long recordId, String snapshotJson) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("entity_type", entityType);
        values.put("record_id", recordId);
        values.put("snapshot_json", snapshotJson);
        long revisionId = db.insert("record_history", null, values);
        db.execSQL("DELETE FROM record_history WHERE entity_type = ? AND record_id = ? " +
                        "AND id NOT IN (SELECT id FROM record_history WHERE entity_type = ? AND record_id = ? ORDER BY id DESC LIMIT 50)",
                new Object[]{entityType, recordId, entityType, recordId});
        return revisionId;
    }

    // --- UTILITIES ---

    private JSONArray cursorToJsonArray(Cursor cursor) {
        JSONArray array = new JSONArray();
        if (cursor == null) return array;

        String[] columnNames = cursor.getColumnNames();
        while (cursor.moveToNext()) {
            JSONObject obj = new JSONObject();
            for (String col : columnNames) {
                int index = cursor.getColumnIndex(col);
                try {
                    switch (cursor.getType(index)) {
                        case Cursor.FIELD_TYPE_INTEGER:
                            obj.put(col, cursor.getLong(index));
                            break;
                        case Cursor.FIELD_TYPE_FLOAT:
                            obj.put(col, cursor.getDouble(index));
                            break;
                        case Cursor.FIELD_TYPE_STRING:
                            obj.put(col, cursor.getString(index));
                            break;
                        case Cursor.FIELD_TYPE_NULL:
                            obj.put(col, JSONObject.NULL);
                            break;
                        default:
                            obj.put(col, cursor.getString(index));
                            break;
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error converting column " + col + " to JSON", e);
                }
            }
            array.put(obj);
        }
        return array;
    }

    private JSONObject cursorToOneJsonObject(Cursor cursor) {
        if (cursor == null || !cursor.moveToFirst()) return null;
        JSONObject obj = new JSONObject();
        String[] columnNames = cursor.getColumnNames();
        for (String col : columnNames) {
            int index = cursor.getColumnIndex(col);
            try {
                switch (cursor.getType(index)) {
                    case Cursor.FIELD_TYPE_INTEGER:
                        obj.put(col, cursor.getLong(index));
                        break;
                    case Cursor.FIELD_TYPE_FLOAT:
                        obj.put(col, cursor.getDouble(index));
                        break;
                    case Cursor.FIELD_TYPE_STRING:
                        obj.put(col, cursor.getString(index));
                        break;
                    case Cursor.FIELD_TYPE_NULL:
                        obj.put(col, JSONObject.NULL);
                        break;
                    default:
                        obj.put(col, cursor.getString(index));
                        break;
                }
            } catch (JSONException e) {
                Log.e(TAG, "Error converting column " + col + " to JSON", e);
            }
        }
        return obj;
    }
}
