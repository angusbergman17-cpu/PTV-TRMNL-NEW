#!/bin/bash
# PTV-TRMNL Standalone Firmware Flash Script
# Run this on your Mac to flash your TRMNL device

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       PTV-TRMNL Standalone Firmware Installer v2.0        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check for PlatformIO
echo -e "${CYAN}[1/5] Checking PlatformIO installation...${NC}"
if command -v pio &> /dev/null; then
    PIO_CMD="pio"
    echo -e "${GREEN}✓ PlatformIO found: $(pio --version)${NC}"
elif [ -f ~/.platformio/penv/bin/pio ]; then
    PIO_CMD=~/.platformio/penv/bin/pio
    echo -e "${GREEN}✓ PlatformIO found at ~/.platformio${NC}"
else
    echo -e "${RED}✗ PlatformIO not found!${NC}"
    echo ""
    echo "Install PlatformIO CLI with:"
    echo "  curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py -o get-platformio.py"
    echo "  python3 get-platformio.py"
    exit 1
fi

# Get server URL
echo ""
echo -e "${CYAN}[2/5] Configuration${NC}"
echo ""

# Check if already configured
CURRENT_URL=$(grep "DEFAULT_SERVER_URL" include/config.h | cut -d'"' -f2)
echo "Current server URL: $CURRENT_URL"
echo ""

read -p "Enter your Render server URL (e.g., https://ptv-trmnl.onrender.com): " SERVER_URL

if [ -z "$SERVER_URL" ]; then
    echo -e "${RED}✗ Server URL is required!${NC}"
    exit 1
fi

# Update config.h
echo ""
echo -e "${CYAN}[3/5] Updating configuration...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|#define DEFAULT_SERVER_URL \".*\"|#define DEFAULT_SERVER_URL \"$SERVER_URL\"|" include/config.h
else
    # Linux
    sed -i "s|#define DEFAULT_SERVER_URL \".*\"|#define DEFAULT_SERVER_URL \"$SERVER_URL\"|" include/config.h
fi
echo -e "${GREEN}✓ Server URL set to: $SERVER_URL${NC}"

# Check for connected device
echo ""
echo -e "${CYAN}[4/5] Looking for connected device...${NC}"
echo ""

# List USB devices
if [[ "$OSTYPE" == "darwin"* ]]; then
    USB_DEVICES=$(ls /dev/cu.usb* 2>/dev/null || true)
else
    USB_DEVICES=$(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true)
fi

if [ -z "$USB_DEVICES" ]; then
    echo -e "${YELLOW}⚠ No USB device detected!${NC}"
    echo ""
    echo "Please:"
    echo "  1. Connect your TRMNL device via USB-C"
    echo "  2. Put it in bootloader mode:"
    echo "     - Hold BOOT button"
    echo "     - Press RESET while holding BOOT"
    echo "     - Release BOOT"
    echo ""
    read -p "Press Enter when device is connected and in bootloader mode..."

    # Check again
    if [[ "$OSTYPE" == "darwin"* ]]; then
        USB_DEVICES=$(ls /dev/cu.usb* 2>/dev/null || true)
    else
        USB_DEVICES=$(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true)
    fi

    if [ -z "$USB_DEVICES" ]; then
        echo -e "${RED}✗ Still no device detected. Please check connection.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Found device(s):${NC}"
echo "$USB_DEVICES"

# Flash firmware
echo ""
echo -e "${CYAN}[5/5] Building and flashing firmware...${NC}"
echo ""
echo "This may take a few minutes on first run (downloading libraries)..."
echo ""

$PIO_CMD run -t upload

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    FLASH SUCCESSFUL!                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo ""
    echo "  1. The device will restart and show a setup screen"
    echo ""
    echo "  2. On your phone, connect to WiFi:"
    echo -e "     ${YELLOW}Network:  PTV-TRMNL-Setup${NC}"
    echo -e "     ${YELLOW}Password: ptvsetup123${NC}"
    echo ""
    echo "  3. Open browser to: ${YELLOW}http://192.168.4.1${NC}"
    echo ""
    echo "  4. Enter your home WiFi credentials and save"
    echo ""
    echo "  5. Device will connect and start showing departures!"
    echo ""
    echo -e "  View your device at: ${CYAN}$SERVER_URL/firmware${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Flash failed! Check the error above.${NC}"
    exit 1
fi
