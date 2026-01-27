#!/bin/bash
# Watch Downloads folder for new images and automatically analyze them

DOWNLOADS_DIR="/Users/angusbergman/Downloads"
CAPTURES_DIR="/Users/angusbergman/PTV-TRMNL-NEW/firmware/captures"
TOOLS_DIR="/Users/angusbergman/PTV-TRMNL-NEW/firmware/tools"
LAST_FILE=""

echo "========================================"
echo "PTV-TRMNL Image Watch & Analyze"
echo "========================================"
echo "Watching: $DOWNLOADS_DIR"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    # Find most recent image
    NEWEST_FILE=$(ls -t "$DOWNLOADS_DIR"/*.{HEIC,heic,jpg,jpeg,png,PNG} 2>/dev/null | head -1)

    if [ ! -z "$NEWEST_FILE" ] && [ "$NEWEST_FILE" != "$LAST_FILE" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📸 New image detected: $(basename "$NEWEST_FILE")"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        LAST_FILE="$NEWEST_FILE"

        # Convert to JPG if HEIC
        ANALYZE_FILE="$NEWEST_FILE"
        if [[ "$NEWEST_FILE" == *.HEIC ]] || [[ "$NEWEST_FILE" == *.heic ]]; then
            echo "🔄 Converting HEIC to JPG..."
            ANALYZE_FILE="$CAPTURES_DIR/latest_display.jpg"
            sips -s format jpeg "$NEWEST_FILE" --out "$ANALYZE_FILE" > /dev/null 2>&1
        else
            # Copy to captures directory
            cp "$NEWEST_FILE" "$CAPTURES_DIR/latest_display.jpg"
            ANALYZE_FILE="$CAPTURES_DIR/latest_display.jpg"
        fi

        # Analyze with visual monitor
        echo ""
        python3 "$TOOLS_DIR/visual-monitor.py" --analyze "$ANALYZE_FILE"
        echo ""
        echo "✅ Analysis complete"
        echo "📁 Saved to: $CAPTURES_DIR"
        echo ""
        echo "Waiting for next image..."
        echo ""
    fi

    sleep 2
done
