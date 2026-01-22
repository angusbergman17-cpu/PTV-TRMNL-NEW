/**
 * PTV-TRMNL Standalone Firmware v2.0
 *
 * Fully independent of TRMNL servers - connects directly to your Render server.
 *
 * Features:
 * - Web-based configuration portal (WiFi + server settings)
 * - OTA firmware updates from your server
 * - 1 minute partial refresh for departure times
 * - 5 minute full refresh for complete screen update
 * - Device registration and health reporting
 * - Persistent settings in flash memory
 * - Low power sleep between updates
 *
 * Hardware: ESP32-C3 + Waveshare 7.5" B/W e-ink
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <Update.h>
#include <esp_wifi.h>
#include <esp_sleep.h>

// GxEPD2 for e-ink display with partial refresh
#define ENABLE_GxEPD2_GFX 1
#include <GxEPD2_BW.h>
#include <Fonts/FreeSansBold24pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSans9pt7b.h>

#include "config.h"

// ============== CONFIGURATION STORAGE ==============
Preferences preferences;

struct DeviceConfig {
    char serverUrl[128];
    char deviceName[32];
    char deviceId[16];
    uint32_t partialRefreshMs;
    uint32_t fullRefreshMs;
    uint32_t sleepMs;
    bool otaEnabled;
    uint32_t firmwareVersion;
} config;

// ============== DISPLAY ==============
GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT> display(
    GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// ============== STATE ==============
unsigned long lastPartialRefresh = 0;
unsigned long lastFullRefresh = 0;
unsigned long lastHealthReport = 0;
int partialRefreshCount = 0;
bool needsFullRefresh = true;
bool configPortalActive = false;
uint32_t bootCount = 0;

// Cached display data
struct DisplayData {
    char timeStr[6];
    int trains[3];
    int trams[3];
    bool coffee;
    char coffeeText[32];
    bool alert;
    char alertText[64];
    unsigned long timestamp;
} displayData;

// ============== WIFI MANAGER PARAMETERS ==============
WiFiManagerParameter* paramServerUrl;
WiFiManagerParameter* paramDeviceName;
WiFiManagerParameter* paramPartialRefresh;
WiFiManagerParameter* paramFullRefresh;

// ============== FUNCTION PROTOTYPES ==============
void initDisplay();
void loadConfig();
void saveConfig();
void connectWiFi();
void startConfigPortal();
bool fetchPartialData();
bool fetchConfig();
bool checkOTA();
void performOTA(const char* url);
void registerDevice();
void reportHealth();
void drawPartialUpdate();
void drawFullScreen();
void drawSetupScreen(const char* ssid, const char* password);
void drawStatusScreen(const char* status);
void drawTime();
void drawTrains();
void drawTrams();
void drawCoffeeBox();
void drawAlertBar();
void enterLightSleep(uint32_t ms);
uint32_t getBatteryMV();
String getDeviceId();
void generateDeviceId();

// ============== SETUP ==============
void setup() {
    Serial.begin(115200);
    delay(500);

    // Increment boot count
    preferences.begin("ptvtrmnl", false);
    bootCount = preferences.getUInt("bootCount", 0) + 1;
    preferences.putUInt("bootCount", bootCount);
    preferences.end();

    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║   PTV-TRMNL Standalone Firmware v2.0   ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.printf("Boot count: %d\n", bootCount);

    // Initialize display
    initDisplay();

    // Load configuration from flash
    loadConfig();
    Serial.printf("Server URL: %s\n", config.serverUrl);
    Serial.printf("Device ID: %s\n", config.deviceId);

    // Show startup screen
    drawStatusScreen("Starting...");

    // Connect WiFi
    connectWiFi();

    // Register device with server
    registerDevice();

    // Check for OTA updates
    if (config.otaEnabled) {
        drawStatusScreen("Checking for updates...");
        checkOTA();
    }

    // Fetch initial config from server
    fetchConfig();

    // Initial full refresh
    needsFullRefresh = true;
}

// ============== MAIN LOOP ==============
void loop() {
    unsigned long now = millis();

    // Skip if config portal is active
    if (configPortalActive) {
        delay(100);
        return;
    }

    // Full refresh check (every fullRefreshMs or on startup)
    if (needsFullRefresh || (now - lastFullRefresh >= config.fullRefreshMs)) {
        Serial.println("[REFRESH] Full screen update");

        if (fetchPartialData()) {
            drawFullScreen();
            lastFullRefresh = now;
            lastPartialRefresh = now;
            partialRefreshCount = 0;
            needsFullRefresh = false;
        }
    }
    // Partial refresh (every partialRefreshMs)
    else if (now - lastPartialRefresh >= config.partialRefreshMs) {
        Serial.println("[REFRESH] Partial update");

        if (fetchPartialData()) {
            drawPartialUpdate();
            lastPartialRefresh = now;
            partialRefreshCount++;

            // Force full refresh after 5 partials to prevent ghosting
            if (partialRefreshCount >= 5) {
                needsFullRefresh = true;
            }
        }
    }

    // Health report every 5 minutes
    if (now - lastHealthReport >= 300000) {
        reportHealth();
        lastHealthReport = now;
    }

    // Battery check
    uint32_t battery = getBatteryMV();
    if (battery < LOW_BATTERY_MV && battery > 1000) {
        Serial.printf("[BATTERY] Low: %d mV\n", battery);
    }

    // Enter light sleep
    Serial.printf("[SLEEP] %d ms\n", config.sleepMs);
    enterLightSleep(config.sleepMs);
}

// ============== CONFIGURATION ==============
void loadConfig() {
    preferences.begin("ptvtrmnl", true);

    // Server URL
    String url = preferences.getString("serverUrl", DEFAULT_SERVER_URL);
    strncpy(config.serverUrl, url.c_str(), sizeof(config.serverUrl));

    // Device name
    String name = preferences.getString("deviceName", "PTV-Display");
    strncpy(config.deviceName, name.c_str(), sizeof(config.deviceName));

    // Device ID (generate if not exists)
    String id = preferences.getString("deviceId", "");
    if (id.length() == 0) {
        generateDeviceId();
    } else {
        strncpy(config.deviceId, id.c_str(), sizeof(config.deviceId));
    }

    // Timing
    config.partialRefreshMs = preferences.getUInt("partialMs", DEFAULT_PARTIAL_MS);
    config.fullRefreshMs = preferences.getUInt("fullMs", DEFAULT_FULL_MS);
    config.sleepMs = preferences.getUInt("sleepMs", DEFAULT_SLEEP_MS);

    // OTA
    config.otaEnabled = preferences.getBool("otaEnabled", true);
    config.firmwareVersion = FIRMWARE_VERSION;

    preferences.end();
}

void saveConfig() {
    preferences.begin("ptvtrmnl", false);
    preferences.putString("serverUrl", config.serverUrl);
    preferences.putString("deviceName", config.deviceName);
    preferences.putString("deviceId", config.deviceId);
    preferences.putUInt("partialMs", config.partialRefreshMs);
    preferences.putUInt("fullMs", config.fullRefreshMs);
    preferences.putUInt("sleepMs", config.sleepMs);
    preferences.putBool("otaEnabled", config.otaEnabled);
    preferences.end();
    Serial.println("[CONFIG] Saved to flash");
}

void generateDeviceId() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    snprintf(config.deviceId, sizeof(config.deviceId), "PTV%02X%02X%02X",
             mac[3], mac[4], mac[5]);

    preferences.begin("ptvtrmnl", false);
    preferences.putString("deviceId", config.deviceId);
    preferences.end();

    Serial.printf("[CONFIG] Generated device ID: %s\n", config.deviceId);
}

// ============== WIFI ==============
void saveConfigCallback() {
    Serial.println("[WIFI] Config saved callback");

    // Get values from custom parameters
    strncpy(config.serverUrl, paramServerUrl->getValue(), sizeof(config.serverUrl));
    strncpy(config.deviceName, paramDeviceName->getValue(), sizeof(config.deviceName));

    // Parse refresh intervals
    config.partialRefreshMs = atoi(paramPartialRefresh->getValue()) * 1000;
    config.fullRefreshMs = atoi(paramFullRefresh->getValue()) * 1000;

    // Validate
    if (config.partialRefreshMs < 30000) config.partialRefreshMs = 60000;
    if (config.fullRefreshMs < 60000) config.fullRefreshMs = 300000;
    config.sleepMs = config.partialRefreshMs - 5000;

    saveConfig();
}

void connectWiFi() {
    WiFiManager wm;

    // Create custom parameters
    char partialStr[8], fullStr[8];
    snprintf(partialStr, sizeof(partialStr), "%d", config.partialRefreshMs / 1000);
    snprintf(fullStr, sizeof(fullStr), "%d", config.fullRefreshMs / 1000);

    paramServerUrl = new WiFiManagerParameter("server", "Server URL", config.serverUrl, 127);
    paramDeviceName = new WiFiManagerParameter("name", "Device Name", config.deviceName, 31);
    paramPartialRefresh = new WiFiManagerParameter("partial", "Partial Refresh (sec)", partialStr, 7);
    paramFullRefresh = new WiFiManagerParameter("full", "Full Refresh (sec)", fullStr, 7);

    wm.addParameter(paramServerUrl);
    wm.addParameter(paramDeviceName);
    wm.addParameter(paramPartialRefresh);
    wm.addParameter(paramFullRefresh);

    wm.setSaveConfigCallback(saveConfigCallback);
    wm.setConfigPortalTimeout(180);
    wm.setConnectTimeout(30);

    // Custom HTML for header
    wm.setCustomHeadElement("<style>body{background:#1a1a2e;color:#fff;}"
        "input{background:#2a2a4e;color:#fff;border:1px solid #444;}"
        "button{background:#64ffda;color:#000;}</style>");

    // Try to connect
    drawStatusScreen("Connecting to WiFi...");
    bool connected = wm.autoConnect(WIFI_AP_NAME, WIFI_AP_PASSWORD);

    if (!connected) {
        Serial.println("[WIFI] Failed to connect");
        drawSetupScreen(WIFI_AP_NAME, WIFI_AP_PASSWORD);

        // Start config portal in blocking mode
        configPortalActive = true;
        wm.startConfigPortal(WIFI_AP_NAME, WIFI_AP_PASSWORD);
        configPortalActive = false;
    }

    Serial.printf("[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

    // Cleanup
    delete paramServerUrl;
    delete paramDeviceName;
    delete paramPartialRefresh;
    delete paramFullRefresh;
}

void startConfigPortal() {
    WiFiManager wm;

    char partialStr[8], fullStr[8];
    snprintf(partialStr, sizeof(partialStr), "%d", config.partialRefreshMs / 1000);
    snprintf(fullStr, sizeof(fullStr), "%d", config.fullRefreshMs / 1000);

    paramServerUrl = new WiFiManagerParameter("server", "Server URL", config.serverUrl, 127);
    paramDeviceName = new WiFiManagerParameter("name", "Device Name", config.deviceName, 31);
    paramPartialRefresh = new WiFiManagerParameter("partial", "Partial Refresh (sec)", partialStr, 7);
    paramFullRefresh = new WiFiManagerParameter("full", "Full Refresh (sec)", fullStr, 7);

    wm.addParameter(paramServerUrl);
    wm.addParameter(paramDeviceName);
    wm.addParameter(paramPartialRefresh);
    wm.addParameter(paramFullRefresh);

    wm.setSaveConfigCallback(saveConfigCallback);

    drawSetupScreen(WIFI_AP_NAME, WIFI_AP_PASSWORD);
    configPortalActive = true;
    wm.startConfigPortal(WIFI_AP_NAME, WIFI_AP_PASSWORD);
    configPortalActive = false;

    delete paramServerUrl;
    delete paramDeviceName;
    delete paramPartialRefresh;
    delete paramFullRefresh;
}

// ============== SERVER COMMUNICATION ==============
bool fetchPartialData() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[API] WiFi disconnected, reconnecting...");
        WiFi.reconnect();
        delay(5000);
        if (WiFi.status() != WL_CONNECTED) return false;
    }

    HTTPClient http;
    String url = String(config.serverUrl) + "/api/partial";

    Serial.printf("[API] Fetching: %s\n", url.c_str());
    http.begin(url);
    http.setTimeout(15000);
    http.addHeader("X-Device-ID", config.deviceId);
    http.addHeader("X-Firmware-Version", String(FIRMWARE_VERSION));

    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, payload);

        if (!error) {
            strncpy(displayData.timeStr, doc["time"] | "--:--", sizeof(displayData.timeStr));

            JsonArray trains = doc["trains"];
            for (int i = 0; i < 3; i++) {
                displayData.trains[i] = (i < trains.size()) ? trains[i].as<int>() : 0;
            }

            JsonArray trams = doc["trams"];
            for (int i = 0; i < 3; i++) {
                displayData.trams[i] = (i < trams.size()) ? trams[i].as<int>() : 0;
            }

            displayData.coffee = doc["coffee"] | false;
            strncpy(displayData.coffeeText, doc["coffeeText"] | "NO DATA", sizeof(displayData.coffeeText));
            displayData.alert = doc["alert"] | false;

            if (doc.containsKey("alertText")) {
                strncpy(displayData.alertText, doc["alertText"] | "", sizeof(displayData.alertText));
            }

            displayData.timestamp = doc["ts"] | millis();

            http.end();
            Serial.println("[API] Data received successfully");
            return true;
        } else {
            Serial.printf("[API] JSON parse error: %s\n", error.c_str());
        }
    } else {
        Serial.printf("[API] HTTP error: %d\n", httpCode);
    }

    http.end();
    return false;
}

bool fetchConfig() {
    HTTPClient http;
    String url = String(config.serverUrl) + "/api/device/config?id=" + config.deviceId;

    http.begin(url);
    http.setTimeout(10000);
    http.addHeader("X-Device-ID", config.deviceId);

    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        JsonDocument doc;

        if (!deserializeJson(doc, payload)) {
            // Update config from server if provided
            if (doc.containsKey("partialRefreshMs")) {
                config.partialRefreshMs = doc["partialRefreshMs"];
            }
            if (doc.containsKey("fullRefreshMs")) {
                config.fullRefreshMs = doc["fullRefreshMs"];
            }
            if (doc.containsKey("sleepMs")) {
                config.sleepMs = doc["sleepMs"];
            }

            saveConfig();
            Serial.println("[CONFIG] Updated from server");
            http.end();
            return true;
        }
    }

    http.end();
    return false;
}

void registerDevice() {
    HTTPClient http;
    String url = String(config.serverUrl) + "/api/device/register";

    http.begin(url);
    http.setTimeout(10000);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["deviceId"] = config.deviceId;
    doc["deviceName"] = config.deviceName;
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["bootCount"] = bootCount;

    String body;
    serializeJson(doc, body);

    int httpCode = http.POST(body);

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        Serial.println("[DEVICE] Registered with server");
    } else {
        Serial.printf("[DEVICE] Registration failed: %d\n", httpCode);
    }

    http.end();
}

void reportHealth() {
    HTTPClient http;
    String url = String(config.serverUrl) + "/api/device/health";

    http.begin(url);
    http.setTimeout(10000);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["deviceId"] = config.deviceId;
    doc["batteryMv"] = getBatteryMV();
    doc["wifiRssi"] = WiFi.RSSI();
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["uptime"] = millis();
    doc["partialCount"] = partialRefreshCount;
    doc["firmwareVersion"] = FIRMWARE_VERSION;

    String body;
    serializeJson(doc, body);

    http.POST(body);
    http.end();

    Serial.println("[HEALTH] Report sent");
}

// ============== OTA UPDATES ==============
bool checkOTA() {
    HTTPClient http;
    String url = String(config.serverUrl) + "/api/firmware/check?version=" +
                 String(FIRMWARE_VERSION) + "&device=" + config.deviceId;

    http.begin(url);
    http.setTimeout(10000);

    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        JsonDocument doc;

        if (!deserializeJson(doc, payload)) {
            bool updateAvailable = doc["updateAvailable"] | false;

            if (updateAvailable) {
                const char* firmwareUrl = doc["firmwareUrl"];
                Serial.printf("[OTA] Update available: %s\n", firmwareUrl);

                drawStatusScreen("Installing update...");
                performOTA(firmwareUrl);
            } else {
                Serial.println("[OTA] Firmware is up to date");
            }
        }
    }

    http.end();
    return false;
}

void performOTA(const char* url) {
    HTTPClient http;
    http.begin(url);
    http.setTimeout(60000);

    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        int contentLength = http.getSize();

        if (contentLength > 0) {
            bool canBegin = Update.begin(contentLength);

            if (canBegin) {
                Serial.println("[OTA] Starting update...");

                WiFiClient* stream = http.getStreamPtr();
                size_t written = Update.writeStream(*stream);

                if (written == contentLength) {
                    Serial.println("[OTA] Written successfully");
                }

                if (Update.end()) {
                    Serial.println("[OTA] Update success, rebooting...");
                    drawStatusScreen("Update complete! Rebooting...");
                    delay(2000);
                    ESP.restart();
                } else {
                    Serial.printf("[OTA] Error: %s\n", Update.errorString());
                }
            }
        }
    }

    http.end();
}

// ============== DISPLAY FUNCTIONS ==============
void initDisplay() {
    SPI.begin(EPD_CLK, -1, EPD_DIN, EPD_CS);
    display.init(115200, true, 2, false);
    display.setRotation(0);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeSans9pt7b);
}

void drawStatusScreen(const char* status) {
    display.setFullWindow();
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);

        // Logo area
        display.setFont(&FreeSansBold24pt7b);
        display.setCursor(250, 180);
        display.print("PTV-TRMNL");

        display.setFont(&FreeSans9pt7b);
        display.setCursor(280, 220);
        display.print("Standalone Firmware v2.0");

        // Status
        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(300, 280);
        display.print(status);

        // Device info
        display.setFont(&FreeSans9pt7b);
        display.setCursor(280, 400);
        display.print("Device: ");
        display.print(config.deviceId);

    } while (display.nextPage());
}

void drawSetupScreen(const char* ssid, const char* password) {
    display.setFullWindow();
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);

        // Header
        display.fillRect(0, 0, 800, 60, GxEPD_BLACK);
        display.setFont(&FreeSansBold18pt7b);
        display.setTextColor(GxEPD_WHITE);
        display.setCursor(200, 42);
        display.print("DEVICE SETUP REQUIRED");
        display.setTextColor(GxEPD_BLACK);

        // Instructions box
        display.drawRect(100, 100, 600, 280, GxEPD_BLACK);
        display.drawRect(101, 101, 598, 278, GxEPD_BLACK);

        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(280, 140);
        display.print("STEP 1: Connect to WiFi");

        display.setFont(&FreeSans9pt7b);
        display.setCursor(200, 175);
        display.print("On your phone or computer, connect to:");

        // WiFi credentials box
        display.fillRect(200, 190, 400, 70, GxEPD_BLACK);
        display.setTextColor(GxEPD_WHITE);
        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(260, 220);
        display.print("Network: ");
        display.print(ssid);
        display.setCursor(260, 250);
        display.print("Password: ");
        display.print(password);
        display.setTextColor(GxEPD_BLACK);

        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(250, 295);
        display.print("STEP 2: Open Browser");

        display.setFont(&FreeSans9pt7b);
        display.setCursor(250, 325);
        display.print("Go to: http://192.168.4.1");

        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(230, 360);
        display.print("STEP 3: Configure Server");

        display.setFont(&FreeSans9pt7b);
        display.setCursor(180, 395);
        display.print("Enter your Render server URL and WiFi details");

        // Footer
        display.setCursor(250, 450);
        display.print("Device ID: ");
        display.print(config.deviceId);

    } while (display.nextPage());
}

void drawPartialUpdate() {
    // Update time region
    display.setPartialWindow(TIME_X, TIME_Y, TIME_W, TIME_H);
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawTime();
    } while (display.nextPage());

    // Update trains region
    display.setPartialWindow(TRAIN_X, TRAIN_Y, TRAIN_W, TRAIN_H);
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawTrains();
    } while (display.nextPage());

    // Update trams region
    display.setPartialWindow(TRAM_X, TRAM_Y, TRAM_W, TRAM_H);
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawTrams();
    } while (display.nextPage());

    // Update coffee box
    display.setPartialWindow(COFFEE_X, COFFEE_Y, COFFEE_W, COFFEE_H);
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawCoffeeBox();
    } while (display.nextPage());

    display.hibernate();
}

void drawFullScreen() {
    display.setFullWindow();
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);

        // Header with time
        display.fillRect(0, 0, 800, 55, GxEPD_BLACK);
        display.setTextColor(GxEPD_WHITE);
        display.setFont(&FreeSansBold24pt7b);
        display.setCursor(20, 42);
        display.print(displayData.timeStr);

        display.setFont(&FreeSansBold12pt7b);
        display.setCursor(600, 35);
        display.print(config.deviceName);
        display.setTextColor(GxEPD_BLACK);

        // Metro section
        display.fillRect(10, 65, 380, 28, GxEPD_BLACK);
        display.setFont(&FreeSans9pt7b);
        display.setTextColor(GxEPD_WHITE);
        display.setCursor(15, 84);
        display.print("METRO TRAINS - FLINDERS STREET");
        display.setTextColor(GxEPD_BLACK);

        drawTrains();

        // Tram section
        display.fillRect(10, 180, 380, 28, GxEPD_BLACK);
        display.setTextColor(GxEPD_WHITE);
        display.setCursor(15, 199);
        display.print("YARRA TRAMS - ROUTE 58");
        display.setTextColor(GxEPD_BLACK);

        drawTrams();

        // Coffee decision panel
        display.drawRect(400, 65, 390, 230, GxEPD_BLACK);
        display.drawRect(401, 66, 388, 228, GxEPD_BLACK);

        display.setFont(&FreeSansBold18pt7b);
        display.setCursor(480, 120);
        if (displayData.coffee) {
            display.print("COFFEE TIME!");
            display.setFont(&FreeSans9pt7b);
            display.setCursor(440, 160);
            display.print("You have time to grab a coffee");
        } else {
            display.print("GO DIRECT");
            display.setFont(&FreeSans9pt7b);
            display.setCursor(450, 160);
            display.print("No time for coffee - head to station");
        }

        // Alert bar
        if (displayData.alert) {
            display.fillRect(10, 305, 780, 35, GxEPD_BLACK);
            display.setTextColor(GxEPD_WHITE);
            display.setFont(&FreeSans9pt7b);
            display.setCursor(20, 328);
            display.print("ALERT: ");
            display.print(displayData.alertText);
            display.setTextColor(GxEPD_BLACK);
        } else {
            display.drawRect(10, 305, 780, 35, GxEPD_BLACK);
            display.setFont(&FreeSans9pt7b);
            display.setCursor(300, 328);
            display.print("Good service on all lines");
        }

        // Footer
        display.setFont(&FreeSans9pt7b);
        display.setCursor(20, 470);
        display.print("ID: ");
        display.print(config.deviceId);
        display.setCursor(200, 470);
        display.print("Firmware: v");
        display.print(FIRMWARE_VERSION);
        display.setCursor(400, 470);
        display.print("WiFi: ");
        display.print(WiFi.RSSI());
        display.print(" dBm");
        display.setCursor(600, 470);
        display.print("Battery: ");
        display.print(getBatteryMV());
        display.print("mV");

    } while (display.nextPage());

    display.hibernate();
}

void drawTime() {
    display.setFont(&FreeSansBold24pt7b);
    display.setCursor(5, 38);
    display.print(displayData.timeStr);
}

void drawTrains() {
    display.setFont(&FreeSansBold12pt7b);
    int y = 115;
    for (int i = 0; i < 3; i++) {
        if (displayData.trains[i] > 0) {
            display.setCursor(20, y);
            if (i == 0) {
                display.print("> ");
            } else {
                display.print("  ");
            }
            display.print(displayData.trains[i]);
            display.print(" min");
            y += 25;
        }
    }
}

void drawTrams() {
    display.setFont(&FreeSansBold12pt7b);
    int y = 230;
    for (int i = 0; i < 3; i++) {
        if (displayData.trams[i] > 0) {
            display.setCursor(20, y);
            if (i == 0) {
                display.print("> ");
            } else {
                display.print("  ");
            }
            display.print(displayData.trams[i]);
            display.print(" min");
            y += 25;
        }
    }
}

void drawCoffeeBox() {
    // Drawn as part of full screen
}

void enterLightSleep(uint32_t ms) {
    esp_sleep_enable_timer_wakeup(ms * 1000ULL);
    esp_light_sleep_start();
}

uint32_t getBatteryMV() {
    analogSetAttenuation(ADC_11db);
    int raw = analogRead(BATTERY_PIN);
    return (raw * 3300 * 2) / 4095;
}
