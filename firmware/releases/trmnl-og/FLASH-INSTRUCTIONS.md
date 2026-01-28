# TRMNL OG Flash Instructions

## Using PlatformIO (Recommended)

```bash
cd firmware
pio run -e trmnl -t upload
```

## Using esptool.py (Manual)

```bash
esptool.py --chip esp32c3 --port /dev/ttyUSB0 --baud 460800 \
  write_flash --flash_mode dio --flash_size detect \
  0x0000 bootloader.bin \
  0x8000 partitions.bin \
  0x10000 firmware.bin
```

## Web Flasher

Visit: https://ptvtrmnl.vercel.app/flasher

## After Flashing

1. Device creates WiFi AP: "PTV-TRMNL-Setup"
2. Connect and open 192.168.4.1
3. Enter your WiFi credentials
4. Device connects and starts displaying
