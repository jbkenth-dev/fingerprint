#pragma once

static const char INSTALL_AP_SSID[] = "FRANCIS_KEY";
static const char INSTALL_AP_PASSWORD[] = "12345678";

// From the ESP32, use your computer's LAN IP, not localhost.
// Example: http://192.168.1.100/fingerprint/api/device.php
static const char DEFAULT_API_URL[] = "http://192.168.1.100/fingerprint/api/device.php";
static const char DEFAULT_API_KEY[] = "FRANCIS_KEY_DEVICE_KEY";
static const char DEFAULT_DEVICE_ID[] = "ESP32-FRANCIS-KEY-01";

static const char DEFAULT_ADMIN_USER[] = "admin";
static const char DEFAULT_ADMIN_PASSWORD[] = "francis123";

static const char PREF_NAMESPACE[] = "francis_key";

static const char TIMEZONE_POSIX[] = "PST-8";
static const char NTP_SERVER_1[] = "pool.ntp.org";
static const char NTP_SERVER_2[] = "time.google.com";

static const char ATTENDANCE_FILE[] = "/attendance.csv";
static const char UNSENT_FILE[] = "/unsent.psv";
static const char UNSENT_TEMP_FILE[] = "/unsent.tmp";
static const char USER_CACHE_FILE[] = "/users.psv";

static const uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
static const uint32_t FINGER_SCAN_TIMEOUT_MS = 20000;
static const uint32_t RFID_SCAN_TIMEOUT_MS = 15000;
static const uint32_t API_CHECK_INTERVAL_MS = 60000;
static const uint32_t OFFLINE_SYNC_INTERVAL_MS = 90000;
static const uint16_t HTTP_TIMEOUT_MS = 12000;

