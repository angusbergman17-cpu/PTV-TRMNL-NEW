/**
 * TRMNL BYOS Firmware for PTV Display
 * Uses bb_epaper library (correct for OG TRMNL hardware)
 * Implements TRMNL BYOS API protocol
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <bb_epaper.h>
#include <PNGdec.h>
#include "../include/config.h"

// E-paper display object (using BBEPAPER class like official firmware)
BBEPAPER bbep(EP75_800x480);

// PNG decoder
PNG png;

// Preferences for persistent storage
Preferences preferences;

// Refresh rate and counters
int refreshRate = 30;  // seconds (30 second updates for real-time data)
int refreshCounter = 0;  // Track refresh cycles for full refresh
const int FULL_REFRESH_CYCLES = 20;  // Full refresh every 20 cycles (10 minutes)

// Template storage
bool hasTemplate = false;  // Track if we have the base template

// Function declarations
void initDisplay();
bool connectWiFi();
bool downloadBaseTemplate();
bool fetchAndDisplayRegionUpdates();
void deepSleep(int seconds);
float getBatteryVoltage();
int getWiFiRSSI();
void showMessage(const char* line1, const char* line2 = "", const char* line3 = "");

void setup() {
    // Initialize preferences
    preferences.begin("trmnl", false);
    refreshCounter = preferences.getInt("refresh_count", 0);

    // Initialize display
    initDisplay();

    // Connect to WiFi
    showMessage("PTV-TRMNL", "Connecting to WiFi...");
    if (!connectWiFi()) {
        showMessage("WiFi connection failed", "Entering sleep mode");
        deepSleep(300);  // Sleep 5 minutes
        return;
    }

    // Check if we need to download base template
    bool needsTemplate = (refreshCounter == 0) || (refreshCounter >= FULL_REFRESH_CYCLES);

    if (needsTemplate) {
        // Download and display base template (full image, slow)
        char msg[50];
        sprintf(msg, "Full refresh (%d/20)", refreshCounter + 1);
        showMessage("Downloading template...", msg);

        if (!downloadBaseTemplate()) {
            showMessage("Template failed", "Trying update anyway");
        } else {
            hasTemplate = true;
            refreshCounter = 0;  // Reset counter after full refresh
            preferences.putInt("refresh_count", refreshCounter);
        }
    }

    // Download and apply region updates (dynamic data, fast)
    char msg[50];
    if (hasTemplate) {
        sprintf(msg, "Partial update (%d/20)", refreshCounter + 1);
        showMessage("Fetching PTV data...", msg);
    } else {
        showMessage("Fetching PTV data...", "(no template yet)");
    }

    if (!fetchAndDisplayRegionUpdates()) {
        showMessage("Update failed", "Will retry in 30s");
    }

    // Increment counter and save
    refreshCounter++;
    if (refreshCounter >= FULL_REFRESH_CYCLES) {
        refreshCounter = 0;  // Will trigger template download next cycle
    }
    preferences.putInt("refresh_count", refreshCounter);

    // Sleep until next refresh
    deepSleep(refreshRate);
}

void loop() {
    // Nothing here - using deep sleep
}

void initDisplay() {
    // Initialize bb_epaper display (7.5" 800x480) - same API as official TRMNL
    bbep.initIO(EPD_DC_PIN, EPD_RST_PIN, EPD_BUSY_PIN, EPD_CS_PIN, EPD_MOSI_PIN, EPD_SCK_PIN, 8000000);
    bbep.setPanelType(EP75_800x480);
    // No rotation - PNG is pre-rotated 270° on server to compensate for hardware orientation
}

void showMessage(const char* line1, const char* line2, const char* line3) {
    bbep.fillScreen(BBEP_WHITE);
    bbep.setFont(FONT_12x16);
    bbep.setCursor(50, 100);
    bbep.print((char*)line1);
    if (strlen(line2) > 0) {
        bbep.setCursor(50, 130);
        bbep.print((char*)line2);
    }
    if (strlen(line3) > 0) {
        bbep.setCursor(50, 160);
        bbep.print((char*)line3);
    }
    bbep.refresh(REFRESH_FULL, true);
}

bool connectWiFi() {
    WiFiManager wm;

    // Set timeout
    wm.setConfigPortalTimeout(180);  // 3 minutes

    // Try to connect
    if (!wm.autoConnect(WIFI_AP_NAME)) {
        return false;
    }

    return WiFi.status() == WL_CONNECTED;
}

// Image buffer for decoded PNG (allocated dynamically)
static uint8_t *imageBuffer = NULL;
static int imageWidth = 0;
static int imageHeight = 0;
static int drawCallCount = 0;

// PNG decoder callback - called for each line of pixels
int PNGDraw(PNGDRAW *pDraw) {
    drawCallCount++;

    if (!imageBuffer) return 0;  // Buffer not allocated

    uint8_t *s = (uint8_t *)pDraw->pPixels;
    int y = pDraw->y;

    // For 1-bit images (black and white) - simplest format
    if (pDraw->iBpp == 1) {
        // Calculate buffer position for this line
        int bytesPerLine = (imageWidth + 7) / 8;
        uint8_t *dest = imageBuffer + (y * bytesPerLine);

        // Copy line data directly
        memcpy(dest, s, bytesPerLine);
    }
    // For 8-bit grayscale
    else if (pDraw->iBpp == 8) {
        // Calculate buffer position
        int bytesPerLine = imageWidth;
        uint8_t *dest = imageBuffer + (y * bytesPerLine);

        // Copy line data
        memcpy(dest, s, imageWidth);
    }

    return 1;  // Success
}

bool downloadBaseTemplate() {
    // Download full base template PNG (done every 10 minutes)
    WiFiClientSecure *client = new WiFiClientSecure();
    if (!client) {
        showMessage("Memory error", "Cannot allocate SSL client");
        return false;
    }

    client->setInsecure();
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/base-template.png";

    showMessage("Downloading template...", "This takes time");
    delay(1000);

    http.setTimeout(60000);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    if (!http.begin(*client, url)) {
        showMessage("HTTP begin failed", "Cannot connect");
        delete client;
        return false;
    }

    int httpCode = http.GET();

    if (httpCode != 200) {
        char errMsg[80];
        sprintf(errMsg, "HTTP error: %d", httpCode);
        showMessage("Download failed", errMsg);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    int len = http.getSize();

    if (len > MAX_PNG_SIZE || len <= 0) {
        char errMsg[80];
        sprintf(errMsg, "Invalid size: %d", len);
        showMessage("Size error", errMsg);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    size_t freeHeap = ESP.getFreeHeap();
    if (freeHeap < MIN_FREE_HEAP) {
        char errMsg[80];
        sprintf(errMsg, "Low memory: %d bytes", freeHeap);
        showMessage("Memory error!", errMsg);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    // Download PNG
    uint8_t* imgBuffer = (uint8_t*)malloc(len);
    if (!imgBuffer) {
        showMessage("malloc failed");
        http.end();
        client->stop();
        delete client;
        return false;
    }

    WiFiClient* stream = http.getStreamPtr();
    int totalRead = 0;
    unsigned long timeout = millis();

    while (http.connected() && totalRead < len) {
        size_t available = stream->available();
        if (available) {
            int c = stream->readBytes(imgBuffer + totalRead, min((int)available, len - totalRead));
            totalRead += c;
            timeout = millis();
        }
        if (millis() - timeout > 10000) break;
    }

    if (totalRead != len) {
        showMessage("Download incomplete");
        free(imgBuffer);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    showMessage("Decoding template...");

    // Decode PNG (don't render, just verify)
    int rc = png.openRAM(imgBuffer, totalRead, PNGDraw);

    if (rc != PNG_SUCCESS) {
        char errMsg[80];
        sprintf(errMsg, "PNG open failed: %d", rc);
        showMessage("Decode error", errMsg);
        free(imgBuffer);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    imageWidth = png.getWidth();
    imageHeight = png.getHeight();

    char msg[80];
    sprintf(msg, "%dx%d, %dbpp", imageWidth, imageHeight, png.getBpp());
    showMessage("Template OK", msg);
    delay(1000);

    png.close();

    // For now, just show success message
    // Full template rendering would go here (but takes too long)
    showMessage("Template downloaded!", "Using text mode");
    delay(2000);

    free(imgBuffer);
    http.end();
    client->stop();
    delete client;

    return true;
}

bool fetchAndDisplayRegionUpdates() {
    // Download JSON region updates and draw text
    WiFiClientSecure *client = new WiFiClientSecure();
    if (!client) {
        return false;
    }

    client->setInsecure();
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/region-updates";

    http.setTimeout(30000);

    if (!http.begin(*client, url)) {
        delete client;
        return false;
    }

    int httpCode = http.GET();

    if (httpCode != 200) {
        http.end();
        client->stop();
        delete client;
        return false;
    }

    String payload = http.getString();
    http.end();
    client->stop();
    delete client;

    // Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
        showMessage("JSON parse error");
        return false;
    }

    // Clear screen and draw text-based layout
    bbep.fillScreen(BBEP_WHITE);
    bbep.setFont(FONT_12x16);

    // Draw header
    bbep.setCursor(20, 30);
    bbep.print("PTV-TRMNL - LIVE DATA");

    // Get regions array
    JsonArray regions = doc["regions"].as<JsonArray>();

    int yPos = 60;
    for (JsonObject region : regions) {
        const char* text = region["text"];

        bbep.setCursor(20, yPos);
        bbep.print(text);

        yPos += 25;

        if (yPos > 450) break;  // Screen limit
    }

    // Determine refresh type
    refreshCounter++;
    bool useFullRefresh = (refreshCounter >= FULL_REFRESH_CYCLES);

    if (useFullRefresh) {
        bbep.refresh(REFRESH_FULL, true);
        refreshCounter = 0;
    } else {
        bbep.refresh(REFRESH_PARTIAL, false);
    }

    return true;
}

void deepSleep(int seconds) {
    // Put display to sleep
    bbep.sleep(DEEP_SLEEP);

    // Configure deep sleep with button wakeup (ESP32-C3 uses GPIO wakeup)
    esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
    esp_sleep_enable_gpio_wakeup();
    gpio_wakeup_enable((gpio_num_t)PIN_INTERRUPT, GPIO_INTR_LOW_LEVEL);

    esp_deep_sleep_start();
}

float getBatteryVoltage() {
    // Read battery voltage from ADC
    int adcValue = analogRead(PIN_BATTERY);
    float voltage = (adcValue / 4095.0) * 3.3 * 2;  // Voltage divider
    return voltage;
}

int getWiFiRSSI() {
    return WiFi.RSSI();
}
