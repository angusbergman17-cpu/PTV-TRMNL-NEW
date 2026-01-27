#!/bin/bash
# Watchdog Flash Script - Auto-reflash on crash/freeze
# Based on prior working recovery methods

FIRMWARE_DIR="/Users/angusbergman/PTV-TRMNL-NEW/firmware"
SERIAL_PORT="/dev/cu.usbmodem14101"
LOG_FILE="/tmp/ptv-watchdog.log"

echo "========================================" | tee "$LOG_FILE"
echo "PTV-TRMNL Watchdog Flash System" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd "$FIRMWARE_DIR"

# Function to force device into bootloader and flash
force_flash() {
    local attempt=$1

    echo "" | tee -a "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
    echo "⚡ FLASH ATTEMPT #$attempt" | tee -a "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
    echo "$(date): Flash attempt #$attempt" >> "$LOG_FILE"

    # Force device into bootloader mode using Python
    echo "🔄 Forcing device into bootloader mode..." | tee -a "$LOG_FILE"
    python3 -c "
import serial
import time

try:
    ser = serial.Serial('$SERIAL_PORT', 115200)
    ser.setDTR(False)
    ser.setRTS(True)
    time.sleep(0.1)
    ser.setRTS(False)
    time.sleep(0.1)
    ser.setDTR(True)
    time.sleep(0.5)
    ser.close()
    print('✅ Device in bootloader mode')
except Exception as e:
    print(f'⚠️  Could not toggle reset: {e}')
" 2>&1 | tee -a "$LOG_FILE"

    sleep 1

    # Build firmware
    echo "🔨 Building firmware..." | tee -a "$LOG_FILE"
    pio run -e trmnl >> "$LOG_FILE" 2>&1

    if [ $? -ne 0 ]; then
        echo "❌ Build failed!" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "✅ Build successful" | tee -a "$LOG_FILE"

    # Flash firmware
    echo "📲 Flashing firmware..." | tee -a "$LOG_FILE"
    pio run -t upload -e trmnl >> "$LOG_FILE" 2>&1

    if [ $? -ne 0 ]; then
        echo "❌ Flash failed!" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "✅ Flash complete" | tee -a "$LOG_FILE"

    # Wait for device to boot
    echo "⏳ Waiting 10 seconds for device to boot..." | tee -a "$LOG_FILE"
    sleep 10

    # Check if device is responding
    echo "🔍 Checking device communication..." | tee -a "$LOG_FILE"
    python3 -c "
import serial
import time

ser = serial.Serial('$SERIAL_PORT', 115200, timeout=1)
start = time.time()
got_data = False

while time.time() - start < 5:
    if ser.in_waiting > 0:
        line = ser.readline()
        try:
            decoded = line.decode('utf-8', errors='ignore').strip()
            if decoded:
                print(f'RX: {decoded}')
                got_data = True
        except:
            pass
    time.sleep(0.1)

ser.close()

if got_data:
    print('✅ Device is communicating')
    exit(0)
else:
    print('⚠️  No serial output detected')
    exit(1)
" 2>&1 | tee -a "$LOG_FILE"

    local result=$?
    echo "" | tee -a "$LOG_FILE"

    return $result
}

# Main loop - try flashing up to 3 times
MAX_ATTEMPTS=3
SUCCESS=0

for i in $(seq 1 $MAX_ATTEMPTS); do
    force_flash $i

    if [ $? -eq 0 ]; then
        echo "🎉 Device successfully flashed and responding!" | tee -a "$LOG_FILE"
        SUCCESS=1
        break
    else
        if [ $i -lt $MAX_ATTEMPTS ]; then
            echo "⚠️  Attempt $i failed, retrying..." | tee -a "$LOG_FILE"
            sleep 2
        else
            echo "❌ All $MAX_ATTEMPTS attempts failed" | tee -a "$LOG_FILE"
        fi
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

if [ $SUCCESS -eq 1 ]; then
    echo "✅ Recovery successful" | tee -a "$LOG_FILE"
    echo "Device should now be running properly" | tee -a "$LOG_FILE"
else
    echo "❌ Recovery failed after $MAX_ATTEMPTS attempts" | tee -a "$LOG_FILE"
    echo "Manual intervention may be required:" | tee -a "$LOG_FILE"
    echo "  1. Unplug and replug device" | tee -a "$LOG_FILE"
    echo "  2. Check USB connection" | tee -a "$LOG_FILE"
    echo "  3. Try: esptool.py --port $SERIAL_PORT erase_flash" | tee -a "$LOG_FILE"
fi

echo "========================================" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"
