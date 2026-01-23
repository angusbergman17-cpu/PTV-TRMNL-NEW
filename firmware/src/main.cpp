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

// Operation logging (circular buffer of recent operations)
#define MAX_LOG_LINES 12
static char logBuffer[MAX_LOG_LINES][60];
static int logIndex = 0;
static int logCount = 0;

// Function declarations
void initDisplay();
bool connectWiFi();
bool downloadBaseTemplate();
bool fetchAndDisplayRegionUpdates();
void deepSleep(int seconds);
float getBatteryVoltage();
int getWiFiRSSI();
void addLog(const char* message);
void showLog();
void showMessage(const char* line1, const char* line2 = "", const char* line3 = "");

void setup() {
    // Initialize preferences
    preferences.begin("trmnl", false);
    refreshCounter = preferences.getInt("refresh_count", 0);

    // Initialize display
    initDisplay();
    addLog("System boot");

    char bootMsg[60];
    sprintf(bootMsg, "Cycle %d/20", refreshCounter);
    addLog(bootMsg);

    // Connect to WiFi
    addLog("Connecting WiFi...");
    showLog();
    if (!connectWiFi()) {
        addLog("WiFi FAILED");
        showLog();
        deepSleep(300);  // Sleep 5 minutes
        return;
    }
    addLog("WiFi connected");

    // Check if we need to download base template
    bool needsTemplate = (refreshCounter == 0) || (refreshCounter >= FULL_REFRESH_CYCLES);

    if (needsTemplate) {
        // Download and display base template (full image, slow)
        char msg[60];
        sprintf(msg, "Template cycle %d/20", refreshCounter);
        addLog(msg);
        addLog("Downloading template...");
        showLog();

        if (!downloadBaseTemplate()) {
            addLog("Template FAILED");
        } else {
            hasTemplate = true;
            refreshCounter = 0;  // Reset counter after full refresh
            preferences.putInt("refresh_count", refreshCounter);
            addLog("Template cached");
        }
    }

    // Download and apply region updates (dynamic data, fast)
    addLog("Fetching PTV data...");
    showLog();

    if (!fetchAndDisplayRegionUpdates()) {
        addLog("Update FAILED");
        showLog();
        delay(3000);
    } else {
        addLog("Update complete");
    }

    // Increment counter and save
    refreshCounter++;
    if (refreshCounter >= FULL_REFRESH_CYCLES) {
        refreshCounter = 0;  // Will trigger template download next cycle
    }
    preferences.putInt("refresh_count", refreshCounter);

    // Sleep until next refresh
    char sleepMsg[60];
    sprintf(sleepMsg, "Sleep %ds (next: %d/20)", refreshRate, refreshCounter);
    addLog(sleepMsg);
    showLog();
    delay(2000);  // Show final log for 2s

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

// Add a log entry to the circular buffer
void addLog(const char* message) {
    // Add timestamp
    unsigned long seconds = millis() / 1000;
    unsigned long minutes = seconds / 60;
    seconds = seconds % 60;

    snprintf(logBuffer[logIndex], 60, "[%02lu:%02lu] %s", minutes, seconds, message);

    logIndex = (logIndex + 1) % MAX_LOG_LINES;
    if (logCount < MAX_LOG_LINES) logCount++;
}

// Display the operation log on screen
void showLog() {
    bbep.fillScreen(BBEP_WHITE);
    bbep.setFont(FONT_8x8);

    // Header
    bbep.setCursor(10, 10);
    bbep.print("PTV-TRMNL OPERATION LOG");
    bbep.setCursor(10, 25);
    bbep.print("========================");

    // Display log entries (oldest to newest)
    int y = 45;
    int displayCount = min(logCount, MAX_LOG_LINES);
    int startIdx = (logIndex - displayCount + MAX_LOG_LINES) % MAX_LOG_LINES;

    for (int i = 0; i < displayCount; i++) {
        int idx = (startIdx + i) % MAX_LOG_LINES;
        bbep.setCursor(10, y);
        bbep.print(logBuffer[idx]);
        y += 15;
        if (y > 460) break;
    }

    // Footer with cycle info
    char footer[60];
    sprintf(footer, "Cycle: %d/20 | Refresh: %ds", refreshCounter, refreshRate);
    bbep.setCursor(10, 465);
    bbep.print(footer);

    bbep.refresh(REFRESH_FULL, true);
}

void showMessage(const char* line1, const char* line2, const char* line3) {
    // Add to log
    if (strlen(line2) > 0) {
        char fullMsg[100];
        snprintf(fullMsg, 100, "%s %s", line1, line2);
        addLog(fullMsg);
    } else {
        addLog(line1);
    }

    // Show log screen
    showLog();
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

// Persistent image buffer for cached template (kept in memory between updates)
static uint8_t *cachedImageBuffer = NULL;
static int imageWidth = 0;
static int imageHeight = 0;
static int imageBpp = 0;
static int drawCallCount = 0;

// Previous region values for change detection
static char prevTime[16] = "";
static char prevTrain1[16] = "";
static char prevTrain2[16] = "";
static char prevTram1[16] = "";
static char prevTram2[16] = "";
static char prevCoffee[64] = "";
static char prevWeather[32] = "";

// PNG decoder callback - called for each line of pixels
int PNGDraw(PNGDRAW *pDraw) {
    drawCallCount++;

    if (!cachedImageBuffer) return 0;  // Buffer not allocated

    uint8_t *s = (uint8_t *)pDraw->pPixels;
    int y = pDraw->y;

    // For 1-bit images (black and white) - simplest format
    if (pDraw->iBpp == 1) {
        // Calculate buffer position for this line
        int bytesPerLine = (imageWidth + 7) / 8;
        uint8_t *dest = cachedImageBuffer + (y * bytesPerLine);

        // Copy line data directly
        memcpy(dest, s, bytesPerLine);
    }
    // For 8-bit grayscale
    else if (pDraw->iBpp == 8) {
        // Calculate buffer position
        int bytesPerLine = imageWidth;
        uint8_t *dest = cachedImageBuffer + (y * bytesPerLine);

        // Copy line data
        memcpy(dest, s, imageWidth);
    }

    return 1;  // Success
}

bool downloadBaseTemplate() {
    // Download full base template PNG (done every 10 minutes)
    addLog("SSL client init");
    WiFiClientSecure *client = new WiFiClientSecure();
    if (!client) {
        addLog("SSL alloc FAILED");
        showLog();
        delete client;
        return false;
    }

    client->setInsecure();
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/base-template.png";

    addLog("HTTP GET template");
    showLog();

    http.setTimeout(60000);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    if (!http.begin(*client, url)) {
        addLog("HTTP begin FAILED");
        showLog();
        delete client;
        return false;
    }

    int httpCode = http.GET();

    if (httpCode != 200) {
        char errMsg[60];
        sprintf(errMsg, "HTTP %d", httpCode);
        addLog(errMsg);
        showLog();
        http.end();
        client->stop();
        delete client;
        return false;
    }

    addLog("HTTP 200 OK");
    int len = http.getSize();

    char sizeMsg[60];
    sprintf(sizeMsg, "PNG size: %d bytes", len);
    addLog(sizeMsg);

    if (len > MAX_PNG_SIZE || len <= 0) {
        addLog("Size check FAILED");
        showLog();
        http.end();
        client->stop();
        delete client;
        return false;
    }

    size_t freeHeap = ESP.getFreeHeap();
    sprintf(sizeMsg, "Free heap: %d bytes", freeHeap);
    addLog(sizeMsg);

    if (freeHeap < MIN_FREE_HEAP) {
        addLog("Heap check FAILED");
        showLog();
        http.end();
        client->stop();
        delete client;
        return false;
    }

    // Download PNG
    addLog("Allocating buffer...");
    uint8_t* imgBuffer = (uint8_t*)malloc(len);
    if (!imgBuffer) {
        addLog("malloc FAILED");
        showLog();
        http.end();
        client->stop();
        delete client;
        return false;
    }
    addLog("Buffer allocated");
    addLog("Downloading...");
    showLog();

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
        char dlMsg[60];
        sprintf(dlMsg, "Download: %d/%d", totalRead, len);
        addLog(dlMsg);
        addLog("Download incomplete");
        showLog();
        free(imgBuffer);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    addLog("Download complete");
    addLog("Opening PNG...");
    showLog();

    // Decode PNG (don't render, just verify)
    int rc = png.openRAM(imgBuffer, totalRead, PNGDraw);

    if (rc != PNG_SUCCESS) {
        char errMsg[60];
        sprintf(errMsg, "PNG open error: %d", rc);
        addLog(errMsg);
        showLog();
        free(imgBuffer);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    imageWidth = png.getWidth();
    imageHeight = png.getHeight();
    imageBpp = png.getBpp();

    char msg[60];
    sprintf(msg, "%dx%d @ %dbpp", imageWidth, imageHeight, imageBpp);
    addLog(msg);

    // Calculate buffer size for decoded image
    int bufferSize;
    if (imageBpp == 1) {
        bufferSize = ((imageWidth + 7) / 8) * imageHeight;  // 1-bit packed
    } else {
        bufferSize = imageWidth * imageHeight;  // 8-bit
    }

    // Allocate persistent cache buffer (only once)
    if (!cachedImageBuffer) {
        sprintf(msg, "Alloc cache: %d bytes", bufferSize);
        addLog(msg);
        showLog();

        cachedImageBuffer = (uint8_t*)malloc(bufferSize);
        if (!cachedImageBuffer) {
            addLog("Cache alloc FAILED");
            showLog();
            png.close();
            free(imgBuffer);
            http.end();
            client->stop();
            delete client;
            return false;
        }
        addLog("Cache allocated");
    }

    // Decode PNG into cached buffer
    addLog("Decoding PNG...");
    showLog();
    drawCallCount = 0;
    rc = png.decode(NULL, 0);
    png.close();

    sprintf(msg, "Decode: %d calls", drawCallCount);
    addLog(msg);

    if (rc != PNG_SUCCESS) {
        char errMsg[60];
        sprintf(errMsg, "Decode error: %d", rc);
        addLog(errMsg);
        showLog();
        free(imgBuffer);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    // Draw cached image to display
    addLog("Drawing to display...");
    showLog();

    bbep.fillScreen(BBEP_WHITE);

    // Draw the decoded image from cache
    if (imageBpp == 1) {
        int bytesPerLine = (imageWidth + 7) / 8;
        for (int y = 0; y < imageHeight; y++) {
            uint8_t *line = cachedImageBuffer + (y * bytesPerLine);
            for (int x = 0; x < imageWidth; x++) {
                int byteIndex = x / 8;
                int bitIndex = 7 - (x % 8);
                uint8_t bit = (line[byteIndex] >> bitIndex) & 1;
                uint8_t color = bit ? BBEP_WHITE : BBEP_BLACK;
                bbep.drawPixel(x, y, color);
            }
            // Yield every 10 lines to prevent watchdog
            if (y % 10 == 0) yield();
        }
    } else {
        for (int y = 0; y < imageHeight; y++) {
            uint8_t *line = cachedImageBuffer + (y * imageWidth);
            for (int x = 0; x < imageWidth; x++) {
                uint8_t gray = line[x];
                uint8_t color = gray >> 4;
                bbep.drawPixel(x, y, color);
            }
            if (y % 10 == 0) yield();
        }
    }

    // Full refresh to show template
    addLog("Full refresh...");
    showLog();
    delay(500);

    bbep.refresh(REFRESH_FULL, true);

    addLog("Template ready!");

    free(imgBuffer);
    http.end();
    client->stop();
    delete client;

    return true;
}

// Helper function: Restore cached image to display instantly
void restoreCachedImage() {
    if (!cachedImageBuffer) return;

    // Copy cached buffer to display
    if (imageBpp == 1) {
        int bytesPerLine = (imageWidth + 7) / 8;
        for (int y = 0; y < imageHeight; y++) {
            uint8_t *line = cachedImageBuffer + (y * bytesPerLine);
            for (int x = 0; x < imageWidth; x++) {
                int byteIndex = x / 8;
                int bitIndex = 7 - (x % 8);
                uint8_t bit = (line[byteIndex] >> bitIndex) & 1;
                uint8_t color = bit ? BBEP_WHITE : BBEP_BLACK;
                bbep.drawPixel(x, y, color);
            }
            if (y % 10 == 0) yield();
        }
    } else {
        for (int y = 0; y < imageHeight; y++) {
            uint8_t *line = cachedImageBuffer + (y * imageWidth);
            for (int x = 0; x < imageWidth; x++) {
                uint8_t gray = line[x];
                uint8_t color = gray >> 4;
                bbep.drawPixel(x, y, color);
            }
            if (y % 10 == 0) yield();
        }
    }
}

bool fetchAndDisplayRegionUpdates() {
    // Step 1: Restore cached image instantly (if available)
    if (cachedImageBuffer) {
        addLog("Restoring cache...");
        showLog();
        restoreCachedImage();
        addLog("Cache restored");
    } else {
        addLog("No cache - clear screen");
        bbep.fillScreen(BBEP_WHITE);
    }

    // Step 2: Download JSON region updates
    addLog("HTTP GET regions");
    WiFiClientSecure *client = new WiFiClientSecure();
    if (!client) {
        addLog("SSL alloc FAILED");
        return false;
    }

    client->setInsecure();
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/region-updates";

    http.setTimeout(30000);

    if (!http.begin(*client, url)) {
        addLog("HTTP begin FAILED");
        delete client;
        return false;
    }

    int httpCode = http.GET();

    if (httpCode != 200) {
        char errMsg[60];
        sprintf(errMsg, "HTTP %d", httpCode);
        addLog(errMsg);
        http.end();
        client->stop();
        delete client;
        return false;
    }

    addLog("HTTP 200 OK");
    String payload = http.getString();
    http.end();
    client->stop();
    delete client;

    char jsonMsg[60];
    sprintf(jsonMsg, "JSON: %d bytes", payload.length());
    addLog(jsonMsg);

    // Step 3: Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
        addLog("JSON parse FAILED");
        showLog();
        return false;
    }

    addLog("JSON parsed");

    // Step 4: Process region updates and draw only changed regions
    JsonArray regions = doc["regions"].as<JsonArray>();
    bool hasChanges = false;
    int changedCount = 0;

    char regMsg[60];
    sprintf(regMsg, "Regions: %d", regions.size());
    addLog(regMsg);

    bbep.setFont(FONT_12x16);

    for (JsonObject region : regions) {
        const char* regionId = region["id"] | "";
        const char* text = region["text"] | "";
        int x = region["x"] | 0;
        int y = region["y"] | 0;
        int w = region["width"] | 100;
        int h = region["height"] | 20;
        bool clear = region["clear"] | false;

        // Compare with previous values to detect changes
        bool changed = false;

        if (strcmp(regionId, "time") == 0) {
            if (strcmp(prevTime, text) != 0) {
                strncpy(prevTime, text, sizeof(prevTime) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "train1") == 0) {
            if (strcmp(prevTrain1, text) != 0) {
                strncpy(prevTrain1, text, sizeof(prevTrain1) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "train2") == 0) {
            if (strcmp(prevTrain2, text) != 0) {
                strncpy(prevTrain2, text, sizeof(prevTrain2) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "tram1") == 0) {
            if (strcmp(prevTram1, text) != 0) {
                strncpy(prevTram1, text, sizeof(prevTram1) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "tram2") == 0) {
            if (strcmp(prevTram2, text) != 0) {
                strncpy(prevTram2, text, sizeof(prevTram2) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "coffee") == 0) {
            if (strcmp(prevCoffee, text) != 0) {
                strncpy(prevCoffee, text, sizeof(prevCoffee) - 1);
                changed = true;
            }
        } else if (strcmp(regionId, "weather") == 0) {
            if (strcmp(prevWeather, text) != 0) {
                strncpy(prevWeather, text, sizeof(prevWeather) - 1);
                changed = true;
            }
        } else {
            // Unknown region - always update
            changed = true;
        }

        // Only redraw if changed
        if (changed) {
            hasChanges = true;
            changedCount++;

            // Clear region if requested
            if (clear) {
                bbep.fillRect(x, y, w, h, BBEP_WHITE);
            }

            // Draw text at specified coordinates
            bbep.setCursor(x, y);
            bbep.print(text);
        }
    }

    char changeMsg[60];
    sprintf(changeMsg, "Changed: %d regions", changedCount);
    addLog(changeMsg);

    // Step 5: Refresh display
    // Use partial refresh for speed (unless it's time for full refresh)
    refreshCounter++;
    bool useFullRefresh = (refreshCounter >= FULL_REFRESH_CYCLES);

    if (useFullRefresh) {
        addLog("Full refresh");
        showLog();
        delay(500);
        bbep.refresh(REFRESH_FULL, true);
        refreshCounter = 0;
    } else {
        // Only refresh if something changed
        if (hasChanges) {
            addLog("Partial refresh");
            showLog();
            delay(500);
            bbep.refresh(REFRESH_PARTIAL, false);
        } else {
            addLog("No changes - skip refresh");
        }
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
