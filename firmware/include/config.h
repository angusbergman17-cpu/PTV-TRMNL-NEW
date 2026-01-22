#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// PTV-TRMNL Standalone Firmware Configuration
// Version 2.0
// ============================================

// Firmware Version (increment for OTA updates)
#define FIRMWARE_VERSION 200  // v2.0.0

// Default Server Configuration
// This will be overwritten when you configure via WiFi portal
#define DEFAULT_SERVER_URL "https://ptv-trmnl-new.onrender.com"

// WiFi Access Point (for initial setup)
#define WIFI_AP_NAME "PTV-TRMNL-Setup"
#define WIFI_AP_PASSWORD "ptvsetup123"

// Default Refresh Timing (milliseconds)
#define DEFAULT_PARTIAL_MS 60000      // 1 minute for partial updates
#define DEFAULT_FULL_MS 300000        // 5 minutes for full refresh
#define DEFAULT_SLEEP_MS 55000        // Sleep time between polls

// Display Configuration (Waveshare 7.5" B/W)
#define DISPLAY_WIDTH 800
#define DISPLAY_HEIGHT 480

// E-ink SPI Pins (TRMNL ESP32-C3 / Generic ESP32-C3)
// Adjust these if using different hardware
#define EPD_BUSY 4
#define EPD_RST 2
#define EPD_DC 3
#define EPD_CS 7
#define EPD_CLK 6
#define EPD_DIN 5

// Partial Refresh Regions (pixel coordinates)
// Time display region (top-left)
#define TIME_X 20
#define TIME_Y 0
#define TIME_W 150
#define TIME_H 55

// Train departures region
#define TRAIN_X 10
#define TRAIN_Y 93
#define TRAIN_W 380
#define TRAIN_H 80

// Tram departures region
#define TRAM_X 10
#define TRAM_Y 208
#define TRAM_W 380
#define TRAM_H 90

// Coffee decision region
#define COFFEE_X 400
#define COFFEE_Y 65
#define COFFEE_W 390
#define COFFEE_H 230

// Battery monitoring
#define BATTERY_PIN 1
#define LOW_BATTERY_MV 3300
#define CRITICAL_BATTERY_MV 3100

// OTA Update Settings
#define OTA_CHECK_INTERVAL 86400000  // Check for updates every 24 hours

// Health Report Settings
#define HEALTH_REPORT_INTERVAL 300000  // Report every 5 minutes

// WiFi Settings
#define WIFI_CONNECT_TIMEOUT 30000     // 30 second connection timeout
#define WIFI_PORTAL_TIMEOUT 180000     // 3 minute config portal timeout

#endif // CONFIG_H
