#!/bin/bash
# Continuous Monitor with Auto-Recovery
# Watches device serial output and automatically reflashes on crash/freeze

FIRMWARE_DIR="/Users/angusbergman/PTV-TRMNL-NEW/firmware"
SERIAL_PORT="/dev/cu.usbmodem14101"
LOG_FILE="/tmp/ptv-continuous-monitor.log"
CRASH_LOG="/tmp/ptv-crash-history.log"

# Timing constants
SILENCE_TIMEOUT=90  # If no output for 90s, consider frozen
CHECK_INTERVAL=10   # Check for freezes every 10s

echo "========================================" | tee "$LOG_FILE"
echo "PTV-TRMNL Continuous Monitor" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Features:" | tee -a "$LOG_FILE"
echo "  • Real-time serial monitoring" | tee -a "$LOG_FILE"
echo "  • Crash pattern detection" | tee -a "$LOG_FILE"
echo "  • Auto-reflash on freeze (${SILENCE_TIMEOUT}s timeout)" | tee -a "$LOG_FILE"
echo "  • Continuous operation" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Press Ctrl+C to stop" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd "$FIRMWARE_DIR"

# Crash counter
TOTAL_CRASHES=0
LAST_CRASH_TIME=0

# Function to flash device
auto_flash() {
    local reason="$1"
    TOTAL_CRASHES=$((TOTAL_CRASHES + 1))
    local now=$(date +%s)

    # Prevent rapid reflashing (must be at least 30s since last crash)
    local elapsed=$((now - LAST_CRASH_TIME))
    if [ $LAST_CRASH_TIME -gt 0 ] && [ $elapsed -lt 30 ]; then
        echo "⚠️  Too soon since last flash ($elapsed s ago), waiting..." | tee -a "$LOG_FILE"
        sleep $((30 - elapsed))
    fi

    LAST_CRASH_TIME=$now

    echo "" | tee -a "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
    echo "⚡ AUTO-RECOVERY #$TOTAL_CRASHES" | tee -a "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
    echo "Reason: $reason" | tee -a "$LOG_FILE"
    echo "Time: $(date)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Log crash
    echo "$(date +%Y-%m-%d\ %H:%M:%S) - Crash #$TOTAL_CRASHES - $reason" >> "$CRASH_LOG"

    # Kill any serial monitors
    pkill -f "python.*serial" 2>/dev/null
    sleep 1

    # Build
    echo "🔨 Building..." | tee -a "$LOG_FILE"
    if ! pio run -e trmnl >> "$LOG_FILE" 2>&1; then
        echo "❌ Build failed!" | tee -a "$LOG_FILE"
        return 1
    fi

    # Flash
    echo "📲 Flashing..." | tee -a "$LOG_FILE"
    if ! pio run -t upload -e trmnl >> "$LOG_FILE" 2>&1; then
        echo "❌ Flash failed!" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "✅ Recovery complete" | tee -a "$LOG_FILE"
    echo "⏳ Waiting 10s for device to boot..." | tee -a "$LOG_FILE"
    sleep 10
    echo "" | tee -a "$LOG_FILE"

    return 0
}

# Start monitoring
echo "👀 Monitoring device..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Use Python for serial monitoring with crash detection
python3 -u <<'PYTHON_SCRIPT' 2>&1 | while IFS= read -r line; do
import serial
import time
import sys
import signal

port = '/dev/cu.usbmodem14101'
baud = 115200
last_output = time.time()
line_count = 0

def signal_handler(sig, frame):
    print('\n\n⏹️  Monitor stopped by user')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

try:
    ser = serial.Serial(port, baud, timeout=1)
    print('✅ Connected to serial port')
    sys.stdout.flush()

    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline()
                decoded = line.decode('utf-8', errors='ignore').strip()

                if decoded:
                    timestamp = time.strftime('%H:%M:%S')
                    print(f'[{timestamp}] {decoded}')
                    sys.stdout.flush()

                    line_count += 1
                    last_output = time.time()

                    # Crash detection patterns
                    lower = decoded.lower()
                    if any(word in lower for word in ['panic', 'abort', 'exception', 'guru meditation']):
                        print('CRASH_DETECTED:' + decoded)
                        sys.stdout.flush()
                        time.sleep(1)
                        sys.exit(1)

                    if 'wdt' in lower or 'watchdog' in lower:
                        print('CRASH_DETECTED:Watchdog timeout')
                        sys.stdout.flush()
                        time.sleep(1)
                        sys.exit(1)

            else:
                # Check for silence (freeze detection)
                silence = time.time() - last_output
                if line_count > 0 and silence > 90:
                    print(f'FREEZE_DETECTED:No output for {int(silence)} seconds')
                    sys.stdout.flush()
                    time.sleep(1)
                    sys.exit(2)

                time.sleep(0.1)

        except serial.SerialException:
            print('SERIAL_ERROR:Lost connection to device')
            sys.stdout.flush()
            time.sleep(2)
            # Try to reconnect
            try:
                ser = serial.Serial(port, baud, timeout=1)
                print('✅ Reconnected')
                sys.stdout.flush()
            except:
                pass

except Exception as e:
    print(f'ERROR:{e}')
    sys.stdout.flush()
    sys.exit(1)
PYTHON_SCRIPT

    # Check Python exit code
    PYTHON_EXIT=$?

    echo "$line" | tee -a "$LOG_FILE"

    # Detect crash/freeze signals
    if echo "$line" | grep -q "CRASH_DETECTED:"; then
        REASON=$(echo "$line" | sed 's/CRASH_DETECTED://')
        echo "🔴 CRASH: $REASON" | tee -a "$LOG_FILE"
        auto_flash "Crash detected: $REASON"

    elif echo "$line" | grep -q "FREEZE_DETECTED:"; then
        echo "🟡 FREEZE: Device not responding" | tee -a "$LOG_FILE"
        auto_flash "Device freeze"

    elif echo "$line" | grep -q "SERIAL_ERROR:"; then
        echo "🟠 CONNECTION LOST" | tee -a "$LOG_FILE"
        auto_flash "Serial connection lost"
    fi

done

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Monitor stopped" | tee -a "$LOG_FILE"
echo "Total crashes handled: $TOTAL_CRASHES" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
