TASK PROMPT FOR AGENT: GENERATE LOCAL FURNITURE MANAGEMENT APP (CAPACITOR + SQLITE + EMBEDDED HTTP SERVER)

You are an expert mobile and web systems engineer. Build a complete, production-ready furniture business management application for an Arch Linux host completely via CLI/terminal commands.

### ARCHITECTURE & CORE REQUIREMENTS
1. Platform: Hybrid web app packaged into an Android APK using Capacitor CLI.
2. Data Persistence: Physical SQLite database stored locally at `context.getFilesDir() + "/furniture.db"`. Browser `localStorage` / `IndexedDB` MUST NOT be used for persistent records.
3. Multi-Device Access via Embedded HTTP Server:
   - Embed a Java/Kotlin HTTP server (e.g., Ktor or NanoHTTPD) directly inside the native Android project.
   - The HTTP server MUST serve static web client assets (SPA) AND REST API endpoints for database CRUD operations on port 8080.
   - Serve both API and static files under the exact same origin (`http://<phone-ip>:8080`) to guarantee ZERO CORS or Mixed Content security issues.
4. Android Foreground Service & Permissions:
   - Create an Android Foreground Service to manage the HTTP server lifecycle so Android's battery manager does not terminate the background listener when the screen turns off.
   - Declare `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_TYPE_SPECIAL_USE` (or `CONNECTED_DEVICE`) in `AndroidManifest.xml` compliant with Android 14+ (API 34/35).
   - Display a persistent notification when desktop mode is active showing the current Wi-Fi IP (e.g., "Desktop Server running at http://192.168.1.15:8080").
5. Mobile & Desktop UX:
   - Touch-optimized, mobile-first Responsive UI (Tailwind CSS or clean lightweight CSS).
   - Main Dashboard includes a prominent toggle button: "Start Desktop Access" / "Stop Desktop Access" showing the local Wi-Fi IP address.
   - Features: Clients CRM, Quote/Order Management, PDF Receipt & Invoice Generator (client-side PDF compilation via pdfmake or @react-pdf/renderer), and Product Catalog.

---

### REPOSITORY & DIRECTORY STRUCTURE
Create the project folder structure strictly as follows:

furniture-app/
├── package.json
├── capacitor.config.json
├── src/                          # Web Frontend Assets
│   ├── index.html
│   ├── main.js (or .ts)
│   ├── components/
│   ├── services/
│   └── styles/
└── android/                      # Native Android Platform
    ├── build.gradle
    ├── app/
    │   ├── build.gradle
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       └── java/com/furniture/app/
    │           ├── MainActivity.java (or .kt)
    │           ├── LocalHttpService.java (Embedded HTTP Server + Foreground Service)
    │           ├── DatabaseHelper.java (SQLite Native Manager)
    │           └── HttpBridgePlugin.java (Capacitor Plugin to start/stop server from JS)

---

### IMPLEMENTATION DETAILS

#### 1. Native Embedded Server (`LocalHttpService.java`/`.kt`)
- Extend `android.app.Service`.
- Implement `startForeground()` with a Notification Channel (`CHANNEL_ID = "furniture_server_channel"`).
- Read the phone's current Wi-Fi IP programmatically (`WifiManager` / `NetworkInterface`).
- Start HTTP Server on port 8080:
  - Route GET `/` -> Serve `index.html` and bundled JS/CSS assets from Android `assets/public`.
  - Route GET/POST/PUT/DELETE `/api/*` -> Execute raw SQL queries against `furniture.db` and return JSON responses.
  - Route GET `/api/ip` -> Returns `{ "ip": "192.168.1.X", "port": 8080, "active": true }`.

#### 2. Native Capacitor Plugin (`HttpBridgePlugin.java`/`.kt`)
- Expose JS methods:
  - `startServer()` -> Triggers `ContextCompat.startForegroundService()`
  - `stopServer()` -> Stops the foreground service.
  - `getServerInfo()` -> Returns `{ ip, port, isRunning }`.

#### 3. SQLite Schema (`furniture.db`)
Execute `CREATE TABLE IF NOT EXISTS` migrations on app launch:
```sql
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    status TEXT DEFAULT 'Pending', -- Pending, In Production, Delivered
    total_amount REAL,
    deposit_amount REAL,
    items_json TEXT, -- Serialized JSON array of ordered items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
4. Frontend Client (src/)
Build a single web codebase that auto-detects execution mode:

Native Mode (Inside Capacitor Android WebView): Calls Capacitor plugin HttpBridgePlugin directly or uses native local database queries.

Desktop Browser Mode (Loaded via http://<phone-ip>:8080): Communicates directly with relative endpoints /api/*.

Provide a clear, clean UI:

New Order Flow: Client selector, product/price input, deposit calculation, status selector.

Receipt Generator: One-click "Generate PDF Receipt" button opening a printable/downloadable invoice with receipt metadata, deposit breakdown, and balance due.

Desktop Server Banner: Simple, bold toggle box on top of the main dashboard displaying the local connection URL.

BUILD COMMANDS TO EXECUTE
Execute all steps sequentially from the Arch terminal without launching GUI interfaces:

npm install

npm run build (outputs compiled web assets to dist/ or www/)

npx cap add android (if not created)

npx cap sync android

cd android && ./gradlew assembleDebug

Confirm generation of debug APK at android/app/build/outputs/apk/debug/app-debug.apk.

Proceed to generate all files, write clean source code, and assemble the APK now.
