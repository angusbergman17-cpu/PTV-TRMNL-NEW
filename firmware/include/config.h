#ifndef CONFIG_H
#define CONFIG_H

/**
 * PTV-TRMNL Firmware Configuration
 * Generic template - device fetches personalized config from server
 *
 * Copyright (c) 2026 Angus Bergman
 * Licensed under CC BY-NC 4.0
 */

// BYOS Server Configuration
// Device will fetch personalized config token from setup wizard
#define SERVER_URL "https://ptvtrmnl.vercel.app"
#define API_DISPLAY_ENDPOINT "/api/device/"  // Append device token here
#define API_SETUP_ENDPOINT "/api/setup"
#define API_LOG_ENDPOINT "/api/log"
#define API_DEVICE_CONFIG_ENDPOINT "/api/device-config"

// WiFi Configuration (Access Point for initial setup)
#define WIFI_AP_NAME "PTV-TRMNL-Setup"
#define WIFI_AP_PASSWORD "transport123"

// Refresh Timing (milliseconds)
#define DEFAULT_REFRESH_INTERVAL 30000
#define DEFAULT_FULL_REFRESH 600000
#define WIFI_TIMEOUT 30000
#define CONFIG_FETCH_TIMEOUT 10000

// Display Configuration (TRMNL 7.5" Waveshare)
#define DISPLAY_WIDTH 800
#define DISPLAY_HEIGHT 480

// E-ink SPI Pins (OG TRMNL ESP32-C3)
#define EPD_SCK_PIN  7
#define EPD_MOSI_PIN 8
#define EPD_CS_PIN   6
#define EPD_RST_PIN  10
#define EPD_DC_PIN   5
#define EPD_BUSY_PIN 4

// Button and battery pins
#define PIN_INTERRUPT 2
#define PIN_BATTERY 3

// Regions for partial refresh
#define TIME_X 20
#define TIME_Y 10
#define TIME_W 135
#define TIME_H 48

#define DEPARTURES_X 30
#define DEPARTURES_Y 100
#define DEPARTURES_W 350
#define DEPARTURES_H 300

#define JOURNEY_BOX_X 500
#define JOURNEY_BOX_Y 110
#define JOURNEY_BOX_W 280
#define JOURNEY_BOX_H 140

// NTP Configuration
#define NTP_SERVER "pool.ntp.org"
#define NTP_OFFSET_SECONDS 39600  // UTC+11 (AEDT)
#define NTP_UPDATE_INTERVAL 60000

// Firmware Version
#define FIRMWARE_VERSION "v5.18"

#endif // CONFIG_H
