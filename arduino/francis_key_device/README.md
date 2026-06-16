# Francis Key ESP32 Attendance Device

This folder contains the Arduino IDE code for the ESP32 Fingerprint + NFC/RFID attendance device and is wired to the current XAMPP project through:

```text
http://<YOUR_PC_LAN_IP>/fingerprint/api/device.php
```

Do not use `localhost` in the ESP32 settings. From the ESP32, `localhost` means the ESP32 itself, not the XAMPP computer.

## Folder structure

```text
arduino/
  francis_key_device/
    francis_key_device.ino  Main ESP32 firmware
    config.h                WiFi portal, API, timing, and SD settings
    pins.h                  ESP32 GPIO map
    README.md               Setup guide
    WIRING.md               Wiring table and circuit notes
    API_CONTRACT.md         PHP API actions used by the firmware
    LIBRARIES.md            Arduino library list
```

## Current project connection

The firmware calls the PHP endpoint added to this project:

```text
api/device.php
```

The endpoint uses the existing `users` table and stores attendance in:

```text
attendance_logs
```

`create_db.sql` was updated so fresh installs create that table. Existing databases are also handled because `api/device.php` creates the attendance table automatically if it is missing.

## First setup

1. Open `francis_key_device.ino` in Arduino IDE.
2. Install the libraries listed in `LIBRARIES.md`.
3. Select an ESP32 board, for example `ESP32 Dev Module`.
4. Upload to the ESP32.
5. On first boot, the TFT shows that the device is not installed.
6. Connect your phone or laptop to WiFi SSID `FT6F8HJ` with password `12345678`.
7. The captive portal opens at `192.168.4.1`.
8. Select your 2.4GHz WiFi network and connect.
9. After reboot, open the ESP32 IP address in a browser.
10. Sign in with HTTP Basic Auth:

```text
Username: admin
Password: francis123
```

11. Go to `Settings` and set `Project API URL` to your XAMPP machine LAN IP:

```text
http://192.168.1.100/fingerprint/api/device.php
```

12. Keep the default API key only for local testing. For real use, change it in both `config.h` and the PHP environment variable `FRANCIS_KEY_DEVICE_KEY`.

## Device workflow

- Registration is started from the ESP32 web page at `/register`.
- The device fetches active users from the current project database.
- Fingerprint registration requires 3 scans.
- RFID registration requires 2 identical UID reads.
- The PHP API updates the selected user's `fingerprintId` and `smartCardId`, and the ESP32 also updates the local SD user cache.
- Attendance requires both fingerprint and RFID.
- The ESP32 validates attendance against the local SD user cache first, then posts or queues the attendance record for online sync.
- Every successful or offline-queued attendance attempt is written to the SD card.
- Offline records are retried automatically when WiFi/API returns.
- `/settings` includes SD card storage status and a browser for folders and files on the card.

## Important

The device can only reach XAMPP if Windows Firewall allows inbound Apache traffic on your private network.
