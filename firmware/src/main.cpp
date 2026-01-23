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
#include <bb_epaper.h>
#include <PNGdec.h>
#include "../include/config.h"

// E-paper display object (using BBEPAPER class like official firmware)
BBEPAPER bbep(EP75_800x480);

// PNG decoder
PNG png;

// Refresh rate
int refreshRate = 900;  // seconds (15 minutes default)

// Function declarations
void initDisplay();
bool connectWiFi();
bool fetchAndDisplayImage();
void deepSleep(int seconds);
float getBatteryVoltage();
int getWiFiRSSI();
void showMessage(const char* line1, const char* line2 = "", const char* line3 = "");

void setup() {
    // Initialize display
    initDisplay();

    // Show startup message
    showMessage("PTV-TRMNL", "Connecting to WiFi...");

    // Connect to WiFi
    if (!connectWiFi()) {
        showMessage("WiFi connection failed", "Entering sleep mode");
        deepSleep(300);  // Sleep 5 minutes
        return;
    }

    // Fetch and display image directly
    showMessage("Downloading image...");
    if (!fetchAndDisplayImage()) {
        showMessage("Failed to fetch image", "Check connection");
    }

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

// PNG decoder callback - called for each line of pixels
static int drawCallCount = 0;
static bool bufferError = false;

int PNGDraw(PNGDRAW *pDraw) {
    drawCallCount++;

    uint8_t *s = (uint8_t *)pDraw->pPixels;
    uint8_t *d = (uint8_t *)bbep.getBuffer();
    int iPitch;

    if (!d) {
        bufferError = true;
        return 0;  // Safety check - buffer not available
    }

    // For 1-bit images (black and white)
    if (pDraw->iBpp == 1) {
        iPitch = (bbep.width() + 7) / 8;
        d += pDraw->y * iPitch;  // Point to correct line
        memcpy(d, s, (pDraw->iWidth + 7) / 8);
    }
    // For 8-bit grayscale, convert to 4-bit (bb_epaper native format)
    else if (pDraw->iBpp == 8) {
        iPitch = bbep.width() / 2;
        d += pDraw->y * iPitch;
        for (int x = 0; x < pDraw->iWidth; x += 2) {
            uint8_t uc = (s[0] & 0xf0) | (s[1] >> 4);
            *d++ = uc;
            s += 2;
        }
    }
    // For RGB, convert to grayscale then 4-bit
    else if (pDraw->iBpp == 24) {
        iPitch = bbep.width() / 2;
        d += pDraw->y * iPitch;
        for (int x = 0; x < pDraw->iWidth; x += 2) {
            // Convert RGB to grayscale
            uint8_t gray1 = (s[0] + s[1] + s[2]) / 3;
            uint8_t gray2 = (s[3] + s[4] + s[5]) / 3;
            uint8_t uc = (gray1 & 0xf0) | (gray2 >> 4);
            *d++ = uc;
            s += 6;
        }
    }
    return 1;  // Success
}

bool fetchAndDisplayImage() {
    // Test WiFi connectivity first
    if (WiFi.status() != WL_CONNECTED) {
        showMessage("WiFi disconnected", "Reconnecting...");
        if (!connectWiFi()) {
            showMessage("WiFi failed", "Cannot connect");
            return false;
        }
    }

    WiFiClientSecure *client = new WiFiClientSecure();
    if (!client) {
        showMessage("Memory error", "Cannot allocate SSL client");
        return false;
    }

    // CRITICAL: Skip SSL certificate validation for Render.com
    client->setInsecure();

    HTTPClient http;
    String imageUrl = String(SERVER_URL) + "/api/live-image.png";

    showMessage("Connecting to:", "ptv-trmnl-new.onrender.com", "/api/live-image.png");
    delay(2000);

    // Set up HTTP client with secure client
    http.setTimeout(30000);  // 30 seconds
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

    if (!http.begin(*client, imageUrl)) {
        showMessage("HTTP begin failed", "Cannot connect");
        delete client;
        return false;
    }

    showMessage("Sending GET request...", "Please wait");
    delay(1000);

    int httpCode = http.GET();

    char httpMsg[80];
    sprintf(httpMsg, "HTTP %d", httpCode);

    if (httpCode > 0) {
        showMessage("Server responded", httpMsg);
    } else {
        // Negative codes are errors
        const char* errorStr = "Unknown error";
        if (httpCode == -1) errorStr = "Connection failed";
        else if (httpCode == -2) errorStr = "Send header failed";
        else if (httpCode == -3) errorStr = "Send payload failed";
        else if (httpCode == -4) errorStr = "Not connected";
        else if (httpCode == -5) errorStr = "Connection lost";
        else if (httpCode == -6) errorStr = "No stream";
        else if (httpCode == -7) errorStr = "No HTTP server";
        else if (httpCode == -8) errorStr = "Too little RAM";
        else if (httpCode == -9) errorStr = "Encoding error";
        else if (httpCode == -10) errorStr = "Stream write error";
        else if (httpCode == -11) errorStr = "Timeout";

        showMessage("Request failed", httpMsg, errorStr);
    }
    delay(3000);  // Show for 3 seconds

    if (httpCode == 200) {
        // Get PNG image data
        int len = http.getSize();
        char sizeMsg[80];
        sprintf(sizeMsg, "Size: %d bytes", len);
        showMessage("Downloading...", sizeMsg);
        delay(1000);

        // Check if size is reasonable
        if (len <= 0 || len > 100000) {
            sprintf(sizeMsg, "Invalid size: %d", len);
            showMessage("Download error", sizeMsg);
            http.end();
            client->stop();
            delete client;
            return false;
        }

        uint8_t* imgBuffer = (uint8_t*)malloc(len);
        if (!imgBuffer) {
            showMessage("Memory error", "Cannot allocate buffer");
            http.end();
            client->stop();
            delete client;
            return false;
        }

        // Download with progress
        WiFiClient* stream = http.getStreamPtr();
        int bytesRead = 0;
        int totalRead = 0;
        unsigned long timeout = millis();

        while (http.connected() && totalRead < len) {
            size_t available = stream->available();
            if (available) {
                int c = stream->readBytes(imgBuffer + totalRead, min((int)available, len - totalRead));
                totalRead += c;
                timeout = millis();
            }
            // Timeout after 10 seconds of no data
            if (millis() - timeout > 10000) {
                break;
            }
        }

        char readMsg[80];
        sprintf(readMsg, "Read: %d/%d bytes", totalRead, len);
        showMessage("Download complete", readMsg);
        delay(1000);

        // Verify we got all the data
        if (totalRead != len) {
            sprintf(readMsg, "Incomplete: %d/%d", totalRead, len);
            showMessage("Download error", readMsg);
            free(imgBuffer);
            http.end();
            client->stop();
            delete client;
            return false;
        }

        // Check PNG signature (first 8 bytes: 89 50 4E 47 0D 0A 1A 0A)
        if (imgBuffer[0] != 0x89 || imgBuffer[1] != 0x50 ||
            imgBuffer[2] != 0x4E || imgBuffer[3] != 0x47) {
            showMessage("Not a PNG file", "Invalid signature");
            delay(2000);
            free(imgBuffer);
            http.end();
            client->stop();
            delete client;
            return false;
        }

        showMessage("Decoding PNG...");
        delay(500);

        // Initialize display buffer first
        bbep.fillScreen(BBEP_WHITE);

        // Open PNG and get info
        int rc = png.openRAM(imgBuffer, totalRead, PNGDraw);

        char debugMsg[80];
        sprintf(debugMsg, "openRAM returned: %d", rc);
        showMessage("PNG open result", debugMsg);
        delay(2000);

        if (rc == PNG_SUCCESS) {
            // Get PNG info
            sprintf(debugMsg, "%dx%d, %dbpp", png.getWidth(), png.getHeight(), png.getBpp());
            showMessage("PNG info", debugMsg);
            delay(2000);

            // Decode the PNG
            showMessage("Calling decode...");
            delay(500);

            // Reset callback counters
            drawCallCount = 0;
            bufferError = false;

            rc = png.decode(NULL, 0);
            png.close();

            sprintf(debugMsg, "decode: %d, calls: %d", rc, drawCallCount);
            showMessage("Decode result", debugMsg);
            delay(2000);

            if (bufferError) {
                showMessage("Buffer error!", "getBuffer() returned NULL");
                delay(3000);
            }

            if (rc == PNG_SUCCESS) {
                // Refresh display
                showMessage("Refreshing display...");
                delay(500);
                bbep.refresh(REFRESH_FULL, true);
                free(imgBuffer);
                http.end();
                client->stop();
                delete client;
                return true;
            }
        }

        // If PNG decode failed, show error
        char errStr[80];
        sprintf(errStr, "PNG error: %d", rc);
        showMessage("Decode failed", errStr);
        delay(3000);

        free(imgBuffer);
    } else {
        // HTTP request failed
        char errMsg[100];
        sprintf(errMsg, "HTTP error: %d", httpCode);
        showMessage("Request failed", errMsg);
    }

    http.end();
    client->stop();
    delete client;
    return false;
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
