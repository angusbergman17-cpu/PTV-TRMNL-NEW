/**
 * PTV-TRMNL v5.11 - Live Dashboard with Zone Partial Refresh
 * CRITICAL: NO WATCHDOG - Continuous refresh for live data
 * Zone-based partial refresh for dynamic updates
 * Shows live time, location awareness, and transit data
 *
 * Copyright (c) 2026 Angus Bergman
 * Licensed under CC BY-NC 4.0
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <bb_epaper.h>
#include "../include/config.h"

// NO WATCHDOG TIMER - Priority: continuous refresh over auto-restart

// Screen dimensions: 800 (width) x 480 (height) LANDSCAPE
#define SCREEN_W 800
#define SCREEN_H 480

BBEPAPER bbep(EP75_800x480);
Preferences preferences;

unsigned long lastRefresh = 0;
const unsigned long REFRESH_INTERVAL = 20000;  // 20s for dynamic updates
const unsigned long FULL_REFRESH_INTERVAL = 600000;  // 10min full refresh
unsigned long lastFullRefresh = 0;
unsigned int refreshCount = 0;
bool wifiConnected = false;
bool deviceRegistered = false;
bool firstDataLoaded = false;
bool systemConfigured = false;

String friendlyID = "";
String apiKey = "";

// Zone-based partial refresh tracking
String prevTime = "";
String prevWeather = "";
String prevLocation = "";
int prevTram1Min = -1;
int prevTram2Min = -1;
int prevTrain1Min = -1;
int prevTrain2Min = -1;

// Time tracking for default dashboard
unsigned long bootTime = 0;

void initDisplay();
void showBootScreen();
void connectWiFiSafe();
void registerDeviceSafe();
void fetchAndDisplaySafe();
void drawSimpleDashboard(String currentTime, String weather, String location,
                         int tram1Min, int tram2Min, int train1Min, int train2Min);
void drawDefaultDashboard();
String getEstimatedTime();

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n==============================");
    Serial.println("PTV-TRMNL v5.11 - Live Dashboard");
    Serial.println("Zone Partial Refresh - NO WATCHDOG");
    Serial.println("800x480 Landscape - Continuous Updates");
    Serial.println("==============================\n");

    // NO WATCHDOG - Priority: continuous display refresh
    Serial.println("✓ Watchdog DISABLED for continuous refresh");

    bootTime = millis();
    preferences.begin("trmnl", false);

    friendlyID = preferences.getString("friendly_id", "");
    apiKey = preferences.getString("api_key", "");

    if (friendlyID.length() > 0 && apiKey.length() > 0) {
        Serial.print("✓ Loaded credentials: ");
        Serial.println(friendlyID);
        deviceRegistered = true;
    } else {
        Serial.println("⚠ No credentials - will register");
    }

    preferences.end();

    Serial.print("Free heap: ");
    Serial.println(ESP.getFreeHeap());

    Serial.println("→ Init display...");
    initDisplay();

    showBootScreen();

    Serial.println("✓ Setup complete");
    Serial.println("→ Entering loop() - device ready\n");
}

void loop() {
    // NO WATCHDOG - Continuous operation for live dashboard

    if (!wifiConnected) {
        connectWiFiSafe();
        if (!wifiConnected) {
            delay(5000);
            return;
        }
        delay(2000);
        lastRefresh = millis();
        return;
    }

    if (!deviceRegistered) {
        registerDeviceSafe();
        if (!deviceRegistered) {
            delay(5000);
            return;
        }
        delay(2000);
        lastRefresh = millis();
        return;
    }

    unsigned long now = millis();

    if (now - lastRefresh >= REFRESH_INTERVAL) {
        lastRefresh = now;

        Serial.print("\n=== REFRESH (20s) Heap: ");
        Serial.print(ESP.getFreeHeap());
        Serial.println(" ===");

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("⚠ WiFi lost");
            wifiConnected = false;
            return;
        }

        fetchAndDisplaySafe();

        Serial.println("=== Complete ===\n");
    }

    delay(1000);
    yield();
}

void initDisplay() {
    bbep.initIO(EPD_DC_PIN, EPD_RST_PIN, EPD_BUSY_PIN, EPD_CS_PIN,
                EPD_MOSI_PIN, EPD_SCK_PIN, 8000000);
    bbep.setPanelType(EP75_800x480);

    // CRITICAL: Rotation 0 = Landscape (800 wide x 480 tall)
    bbep.setRotation(0);

    pinMode(PIN_INTERRUPT, INPUT_PULLUP);

    Serial.println("✓ Display init");
    Serial.println("  Panel: EP75 800x480");
    Serial.println("  Rotation: 0 (Landscape)");
    Serial.println("  Width: 800px, Height: 480px");
}

void showBootScreen() {
    bbep.fillScreen(BBEP_WHITE);

    // Center text on 800x480 screen
    bbep.setFont(FONT_12x16);
    bbep.setCursor(280, 220);
    bbep.print("PTV-TRMNL v5.9");

    bbep.setFont(FONT_8x8);
    bbep.setCursor(280, 250);
    bbep.print("Default Dashboard");

    bbep.refresh(REFRESH_FULL, true);
    lastFullRefresh = millis();
    Serial.println("✓ Boot screen displayed");
}

void connectWiFiSafe() {
    Serial.println("→ Connecting WiFi...");

    WiFiManager wm;
    wm.setConfigPortalTimeout(30);
    wm.setConnectTimeout(20);

    if (!wm.autoConnect(WIFI_AP_NAME, WIFI_AP_PASSWORD)) {
        Serial.println("⚠ WiFi failed");
        wifiConnected = false;
        return;
    }

    Serial.print("✓ WiFi OK - IP: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
}

void registerDeviceSafe() {
    Serial.println("→ Registering device...");

    WiFiClient client;
    HTTPClient http;

    String url = String(SERVER_URL) + "/api/setup";
    url.replace("https://", "http://");

    http.setTimeout(10000);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.setRedirectLimit(2);

    if (!http.begin(client, url)) {
        Serial.println("⚠ HTTP begin fail");
        return;
    }

    String macAddress = WiFi.macAddress();
    http.addHeader("ID", macAddress);

    int httpCode = http.GET();

    if (httpCode != 200) {
        Serial.print("⚠ HTTP ");
        Serial.println(httpCode);
        http.end();
        return;
    }

    String response = http.getString();
    http.end();

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);
    if (error) {
        Serial.print("⚠ Parse: ");
        Serial.println(error.c_str());
        return;
    }

    friendlyID = doc["friendly_id"] | "";
    apiKey = doc["api_key"] | "";

    if (friendlyID.length() == 0 || apiKey.length() == 0) {
        Serial.println("⚠ Invalid response");
        return;
    }

    preferences.begin("trmnl", false);
    preferences.putString("friendly_id", friendlyID);
    preferences.putString("api_key", apiKey);
    preferences.end();

    Serial.print("✓ Registered as: ");
    Serial.println(friendlyID);
    deviceRegistered = true;
}

void fetchAndDisplaySafe() {
    Serial.println("→ Fetching...");

    String payload = "";
    {
        WiFiClientSecure *client = new WiFiClientSecure();
        if (!client) {
            Serial.println("⚠ No memory");
            return;
        }

        client->setInsecure();
        HTTPClient http;
        String url = String(SERVER_URL) + "/api/display";
        http.setTimeout(10000);

        if (!http.begin(*client, url)) {
            Serial.println("⚠ HTTP begin fail");
            delete client;
            return;
        }

        http.addHeader("ID", friendlyID);
        http.addHeader("Access-Token", apiKey);
        http.addHeader("FW-Version", "5.11");

        int httpCode = http.GET();
        if (httpCode != 200) {
            Serial.print("⚠ HTTP ");
            Serial.println(httpCode);
            http.end();
            delete client;

            // HTTP 500 = System not configured - show live default dashboard
            if (httpCode == 500) {
                systemConfigured = false;
                Serial.println("  System not configured - showing LIVE default dashboard");
                drawDefaultDashboard();  // Always refresh with live time
            }
            return;
        }

        // System is configured, show live data
        systemConfigured = true;

        payload = http.getString();
        http.end();
        delete client;
        client = nullptr;
    }

    delay(500);
    yield();

    String currentTime = "00:00";
    String weather = "Clear";
    String location = "MELBOURNE";
    int tram1Min = 2;
    int tram2Min = 5;
    int train1Min = 3;
    int train2Min = 7;

    {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
            Serial.print("⚠ Parse: ");
            Serial.println(error.c_str());
            return;
        }

        currentTime = String(doc["current_time"] | "00:00");
        weather = String(doc["weather"] | "Clear");
        location = String(doc["location"] | "MELBOURNE");

        // Parse transit data if available
        if (doc.containsKey("trams") && doc["trams"].is<JsonArray>()) {
            JsonArray trams = doc["trams"];
            if (trams.size() > 0) tram1Min = trams[0]["minutes"] | 2;
            if (trams.size() > 1) tram2Min = trams[1]["minutes"] | 5;
        }

        if (doc.containsKey("trains") && doc["trains"].is<JsonArray>()) {
            JsonArray trains = doc["trains"];
            if (trains.size() > 0) train1Min = trains[0]["minutes"] | 3;
            if (trains.size() > 1) train2Min = trains[1]["minutes"] | 7;
        }

        doc.clear();
    }

    payload = "";
    delay(300);
    yield();

    drawSimpleDashboard(currentTime, weather, location, tram1Min, tram2Min, train1Min, train2Min);

    refreshCount++;
}

void drawSimpleDashboard(String currentTime, String weather, String location,
                         int tram1Min, int tram2Min, int train1Min, int train2Min) {
    Serial.println("  Drawing LIVE dashboard (zone partial refresh)...");

    unsigned long now = millis();
    bool needsFullRefresh = !firstDataLoaded ||
                           (now - lastFullRefresh >= FULL_REFRESH_INTERVAL) ||
                           (refreshCount % 30 == 0);

    if (needsFullRefresh) {
        Serial.println("  → FULL REFRESH");

        bbep.fillScreen(BBEP_WHITE);

        // === TOP BAR (Y: 0-60) - ZONE 1 ===
        // Location - top left
        bbep.setFont(FONT_12x16);
        bbep.setCursor(20, 30);
        bbep.print(location.c_str());

        // Time - top right
        bbep.setFont(FONT_12x16);
        bbep.setCursor(650, 30);
        bbep.print(currentTime.c_str());

        // === MIDDLE SECTION (Y: 80-400) - ZONES 2-5 ===
        // Trams section - ZONE 2
        bbep.setFont(FONT_12x16);
        bbep.setCursor(50, 150);
        bbep.print("TRAMS");
        bbep.setFont(FONT_8x8);
        bbep.setCursor(60, 180);
        bbep.print("Route 58 - ");
        bbep.print(tram1Min);
        bbep.print(" min");
        bbep.setCursor(60, 200);
        bbep.print("Route 96 - ");
        bbep.print(tram2Min);
        bbep.print(" min");

        // Trains section - ZONE 3
        bbep.setFont(FONT_12x16);
        bbep.setCursor(400, 150);
        bbep.print("TRAINS");
        bbep.setFont(FONT_8x8);
        bbep.setCursor(410, 180);
        bbep.print("City Loop - ");
        bbep.print(train1Min);
        bbep.print(" min");
        bbep.setCursor(410, 200);
        bbep.print("Parliament - ");
        bbep.print(train2Min);
        bbep.print(" min");

        // Large time display - ZONE 4
        bbep.setFont(FONT_12x16);
        bbep.setCursor(250, 300);
        bbep.print("TIME: ");
        bbep.print(currentTime.c_str());

        // === BOTTOM BAR (Y: 420-480) - ZONE 5 ===
        bbep.setFont(FONT_8x8);
        bbep.setCursor(20, 450);
        bbep.print("Weather: ");
        bbep.print(weather.c_str());

        bbep.setCursor(650, 450);
        bbep.print("v5.11 Live");

        Serial.println("  Zone layout complete (5 zones)");
        Serial.println("  Coordinates: X(0-800) Y(0-480)");

        bbep.refresh(REFRESH_FULL, true);
        lastFullRefresh = now;
        firstDataLoaded = true;

    } else {
        Serial.println("  → ZONE PARTIAL REFRESH");
        bool anyUpdates = false;

        // ZONE 1 - Top right time
        if (currentTime != prevTime) {
            Serial.println("    Zone 1: Time update");
            bbep.fillRect(650, 15, 130, 30, BBEP_WHITE);
            bbep.setFont(FONT_12x16);
            bbep.setCursor(650, 30);
            bbep.print(currentTime.c_str());

            // Also update ZONE 4 - Large time
            Serial.println("    Zone 4: Large time update");
            bbep.fillRect(250, 285, 300, 30, BBEP_WHITE);
            bbep.setFont(FONT_12x16);
            bbep.setCursor(250, 300);
            bbep.print("TIME: ");
            bbep.print(currentTime.c_str());
            anyUpdates = true;
        }

        // ZONE 1 - Top left location
        if (location != prevLocation) {
            Serial.println("    Zone 1: Location update");
            bbep.fillRect(20, 15, 300, 30, BBEP_WHITE);
            bbep.setFont(FONT_12x16);
            bbep.setCursor(20, 30);
            bbep.print(location.c_str());
            anyUpdates = true;
        }

        // ZONE 2 - Tram times
        if (tram1Min != prevTram1Min || tram2Min != prevTram2Min) {
            Serial.println("    Zone 2: Tram times update");
            bbep.fillRect(60, 165, 300, 50, BBEP_WHITE);
            bbep.setFont(FONT_8x8);
            bbep.setCursor(60, 180);
            bbep.print("Route 58 - ");
            bbep.print(tram1Min);
            bbep.print(" min");
            bbep.setCursor(60, 200);
            bbep.print("Route 96 - ");
            bbep.print(tram2Min);
            bbep.print(" min");
            anyUpdates = true;
        }

        // ZONE 3 - Train times
        if (train1Min != prevTrain1Min || train2Min != prevTrain2Min) {
            Serial.println("    Zone 3: Train times update");
            bbep.fillRect(410, 165, 350, 50, BBEP_WHITE);
            bbep.setFont(FONT_8x8);
            bbep.setCursor(410, 180);
            bbep.print("City Loop - ");
            bbep.print(train1Min);
            bbep.print(" min");
            bbep.setCursor(410, 200);
            bbep.print("Parliament - ");
            bbep.print(train2Min);
            bbep.print(" min");
            anyUpdates = true;
        }

        // ZONE 5 - Weather (bottom left)
        if (weather != prevWeather) {
            Serial.println("    Zone 5: Weather update");
            bbep.fillRect(90, 435, 200, 30, BBEP_WHITE);
            bbep.setFont(FONT_8x8);
            bbep.setCursor(90, 450);
            bbep.print(weather.c_str());
            anyUpdates = true;
        }

        if (anyUpdates) {
            bbep.refresh(REFRESH_PARTIAL, true);
        } else {
            Serial.println("    No changes - skipping refresh");
        }
    }

    prevTime = currentTime;
    prevWeather = weather;
    prevLocation = location;
    prevTram1Min = tram1Min;
    prevTram2Min = tram2Min;
    prevTrain1Min = train1Min;
    prevTrain2Min = train2Min;

    Serial.print("✓ Display updated (");
    Serial.print(needsFullRefresh ? "FULL" : "ZONE PARTIAL");
    Serial.print(", #");
    Serial.print(refreshCount);
    Serial.println(")");

    yield();
    delay(500);
    yield();
}

// Get estimated time since boot (rough approximation)
String getEstimatedTime() {
    unsigned long elapsedSeconds = (millis() - bootTime) / 1000;
    unsigned long hours = (elapsedSeconds / 3600) % 24;
    unsigned long minutes = (elapsedSeconds / 60) % 60;

    char timeStr[6];
    sprintf(timeStr, "%02lu:%02lu", hours, minutes);
    return String(timeStr);
}

// Draw default dashboard when system is not configured
// LIVE REFRESH - Updates every 20s with current time
void drawDefaultDashboard() {
    Serial.println("  Drawing LIVE default dashboard (setup in progress)...");

    String currentTime = getEstimatedTime();
    unsigned long now = millis();
    bool needsFullRefresh = !firstDataLoaded ||
                           (now - lastFullRefresh >= FULL_REFRESH_INTERVAL);

    if (needsFullRefresh) {
        Serial.println("  → FULL REFRESH");

        bbep.fillScreen(BBEP_WHITE);

        // === TOP BAR (Y: 0-60) ===
        // Title - left
        bbep.setFont(FONT_12x16);
        bbep.setCursor(20, 30);
        bbep.print("PTV-TRMNL");

        // Live time - right
        bbep.setCursor(650, 30);
        bbep.print(currentTime.c_str());

        // === MIDDLE SECTION (Y: 80-400) ===
        // Status message
        bbep.setFont(FONT_12x16);
        bbep.setCursor(200, 120);
        bbep.print("SETUP IN PROGRESS");

        // Large time display
        bbep.setCursor(250, 200);
        bbep.print("TIME: ");
        bbep.print(currentTime.c_str());

        // Information bars
        bbep.setFont(FONT_8x8);

        // Device ID
        bbep.setCursor(150, 280);
        bbep.print("Device: ");
        bbep.print(friendlyID.c_str());

        // WiFi Status
        bbep.setCursor(150, 310);
        bbep.print("WiFi: Connected");

        // Instructions
        bbep.setCursor(100, 360);
        bbep.print("Complete setup at:");
        bbep.setCursor(100, 380);
        bbep.print("https://ptv-trmnl-new.onrender.com/admin");

        // === BOTTOM BAR (Y: 420-480) ===
        bbep.setFont(FONT_8x8);
        bbep.setCursor(20, 450);
        bbep.print("Firmware: v5.11");

        bbep.setCursor(300, 450);
        bbep.print("LIVE - Updates every 20s");

        bbep.setCursor(650, 450);
        bbep.print("Zone refresh");

        Serial.println("  Default dashboard with LIVE time");

        bbep.refresh(REFRESH_FULL, true);
        lastFullRefresh = now;
        firstDataLoaded = true;

    } else {
        Serial.println("  → ZONE PARTIAL REFRESH (time updates)");

        // Update time - top right (Zone 1)
        if (currentTime != prevTime) {
            bbep.fillRect(650, 15, 130, 30, BBEP_WHITE);
            bbep.setFont(FONT_12x16);
            bbep.setCursor(650, 30);
            bbep.print(currentTime.c_str());

            // Update large time (Zone 2)
            bbep.fillRect(250, 185, 300, 30, BBEP_WHITE);
            bbep.setCursor(250, 200);
            bbep.print("TIME: ");
            bbep.print(currentTime.c_str());

            bbep.refresh(REFRESH_PARTIAL, true);
        }
    }

    prevTime = currentTime;

    Serial.println("✓ LIVE default dashboard updated");

    yield();
    delay(500);
    yield();
}
