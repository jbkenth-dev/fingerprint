#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#include <FS.h>
#include <time.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <Adafruit_PN532.h>
#include <Adafruit_Fingerprint.h>
#include <RTClib.h>

#include "config.h"
#include "pins.h"

static const char DEFAULT_API_HOST[] = "192.168.1.100";

enum DeviceMode {
  MODE_INSTALL_PORTAL,
  MODE_HOME,
  MODE_REGISTER_FINGERPRINT,
  MODE_REGISTER_RFID,
  MODE_WAIT_RFID_ATTENDANCE
};

enum WifiState {
  WIFI_STATE_DISCONNECTED,
  WIFI_STATE_SCANNING,
  WIFI_STATE_CONNECTING,
  WIFI_STATE_AUTHENTICATING,
  WIFI_STATE_CONNECTED,
  WIFI_STATE_CONNECTION_FAILED,
  WIFI_STATE_RECONNECTING
};

struct LocalUser {
  bool found = false;
  String userId;
  String idNumber;
  String fullName;
  String role;
  String status;
  String fingerprintId;
  String smartCardId;
};

struct AttendanceResult {
  bool ok = false;
  bool duplicate = false;
  String attendanceId;
  String idNumber;
  String fullName;
  String status;
  String date;
  String time;
  String error;
  int httpCode = 0;
};

struct UiState {
  uint32_t seq = 0;
  String type = "boot";
  String title = "FRANCIS KEY";
  String line1 = "Starting Device";
  String line2 = "Please wait";
  String line3 = "";
  uint16_t accent = ILI9341_CYAN;
  uint32_t updatedAt = 0;
};

Preferences prefs;
DNSServer dnsServer;
WebServer server(80);
HardwareSerial fingerSerial(2);

Adafruit_ILI9341 tft(TFT_CS_PIN, TFT_DC_PIN, TFT_RST_PIN);
Adafruit_PN532 nfc(PN532_IRQ_PIN, PN532_RESET_PIN, &Wire);
Adafruit_Fingerprint finger(&fingerSerial);
RTC_DS3231 rtc;

DeviceMode mode = MODE_HOME;

String wifiSsid;
String wifiPassword;
String apiUrl;
String apiKey;
String deviceId;
String adminUser;
String adminPassword;
String sessionToken;
uint32_t sessionExpiresAt = 0;

bool wifiReady = false;
bool databaseReady = false;
bool sdReady = false;
bool rtcReady = false;
bool nfcReady = false;
bool fingerprintReady = false;
bool tftReady = false;

int pendingRegistrationUserId = 0;
String pendingRegistrationIdNumber;
String pendingRegistrationName;
uint16_t pendingFingerprintTemplateId = 0;
String pendingRfidUid;
String registrationPhase = "idle";
String registrationError;
bool registrationCancelRequested = false;

String attendanceFingerprintId;
String attendanceRfidUid;
uint32_t attendanceRfidStartedAt = 0;

bool homeScreenVisible = false;
String lastHomeDateText;
String lastHomeTimeText;
String lastHomeDayText;
String lastHomeIpText;

uint32_t lastHomeUpdateAt = 0;
uint32_t lastApiCheckAt = 0;
uint32_t lastSyncAt = 0;
uint32_t lastWifiReconnectAt = 0;
WifiState wifiState = WIFI_STATE_DISCONNECTED;

UiState uiState;
uint16_t studentInMinutes = DEFAULT_STUDENT_IN_MINUTES;
uint16_t outDelayMinutes = DEFAULT_OUT_DELAY_MINUTES;
String apiHost;
String defaultApiHost;

static uint16_t _pendingQueueCache = 0;
static bool _pendingQueueCacheValid = false;

void initPins();
void loadSettings();
void saveSettings();
void initDisplay();
void initBusesAndDevices();
void deselectSpiDevices();
void beginTftAccess();
void beginSdAccess();
void endSdAccess();
bool sdFileExists(const char *path);
File openSdFile(const char *path, const char *mode);
void closeSdFile(File &file);
bool removeSdFile(const char *path);
bool renameSdFile(const char *fromPath, const char *toPath);
void startInstallPortal();
void setupPortalRoutes();
void setupDeviceRoutes();
void connectToSavedWifi();
bool connectToWifi(const String &ssid, const String &password, uint32_t timeoutMs);
void serviceWeb();
void syncClock();
DateTime currentDateTime();
String formatDate(const DateTime &dt);
String formatTime12(const DateTime &dt);
String formatDay(const DateTime &dt);
String isoNow();
String minutesToTimeInput(uint16_t minutes);
uint16_t timeInputToMinutes(String value, uint16_t fallback);
void drawScreen(const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent);
void setUiState(const String &type, const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent);
void drawInstallScreen();
void drawHomeScreen();
void updateHomeClock(bool force = false);
void drawHomeNetworkLine(bool force = false);
void drawStatusFooter();
void drawCentered(int y, const String &text, uint16_t color, uint8_t size);
void printNetworkInfo(const String &context);
void signalFingerprint();
void signalRfid();
void signalSuccess();
void signalError();
void signalUnauthorized();
void pulseLed(uint8_t pin, uint16_t durationMs);
void buzz(uint16_t durationMs, uint16_t pauseMs = 0);
String htmlPage(const String &title, const String &body);
void sendLoginPage(const String &message = "");
void sendAppShell();
String htmlEscape(String value);
String jsonEscape(String value);
bool requireAdmin();
bool requireApiAdmin();
bool isAuthenticated();
void beginSession();
void clearSession();
String cookieValue(const String &name);
void sendJson(int status, const String &payload);
void redirectToRoot();
void handleAppRoot();
void handleLoginPost();
void handleLogout();
void handleApiState();
void handleApiStudents();
void handleApiRegisterStart();
void handleApiRegisterStatus();
void handleApiRegisterCancel();
void handleApiAttendance();
void handleApiUsers();
void handleApiWifiScan();
void handleApiWifiSave();
void handleApiWifiStatus();
void handleApiRules();
void handleApiLogs();
void handleApiBackupSettings();
void handleApiBackupFile();
void handleApiRestoreSettings();
void handleApiRestoreFile();
void handleApiSdFile();
void handleApiCacheClear();
String buildUserOptions();
bool getDeviceJson(const String &action, DynamicJsonDocument &response, int &httpCode, String &error);
bool postDeviceJson(const String &action, DynamicJsonDocument &request, DynamicJsonDocument &response, int &httpCode, String &error);
String endpointFor(const String &action);
bool checkApiStatus();
bool fetchAndCacheUsers();
bool registerCredentials(uint16_t fingerprintId, const String &rfidUid, String &error);
bool upsertCachedUser(const LocalUser &updated, String &error);
String cachedUserLine(const LocalUser &user);
void writeCachedUserLine(File &file, const LocalUser &user);
String cacheSafe(String value);
AttendanceResult postAttendance(const String &fingerprintId, const String &rfidUid, const String &occurredAt, const String &localRecordId);
void runRegistrationWorkflow();
bool enrollFingerprint(uint16_t templateId, String &errorMsg);
bool waitForFingerprintImage(uint8_t slot, uint32_t timeoutMs);
bool waitForFingerRelease(uint32_t timeoutMs);
uint16_t fingerprintTemplateForUser(int userId);
bool enrollRfid(String &uid);
bool readRfidUid(String &uid, uint16_t timeoutMs);
String bytesToHex(const uint8_t *bytes, uint8_t length);
void runAttendanceWorkflow();
int scanFingerprintForAttendance();
void completeAttendanceAttempt();
void ensureSdFiles();
void appendLine(const char *path, const String &line);
void logEvent(const String &category, const String &message);
String csvEscape(String value);
void appendAttendanceCsv(const String &date, const String &time, const String &id, const String &name, const String &status);
void queueOfflineAttendance(const String &localRecordId, const String &occurredAt, const String &fingerprintId, const String &rfidUid);
void syncOfflineRecords();
LocalUser findCachedUserByCredentials(const String &fingerprintId, const String &rfidUid);
LocalUser findCachedUserById(const String &userId);
String localNextStatus(const String &date, const String &id);
int minutesSinceLastIn(const String &date, const String &id, const DateTime &now);
int hhmmssToMinutes(const String &value);
uint16_t pendingQueueCount();
String fieldAt(const String &line, char separator, int index);
String makeLocalRecordId();
void maintainWifi();
void saveRules();
String normalizeSdPath(String path);
String parentSdPath(const String &path);
String sdChildPath(const String &parentPath, const String &childName);
String urlEncode(const String &value);
String fileSizeLabel(uint32_t size);
String backupFilePathForName(const String &name);
void debugSdStatus();
bool saveCredentialsLocally(uint16_t fingerprintId, const String &rfidUid, String &error);
void handleApiTimeSet();
void handleApiWifiReset();
void handleApiSettingsApi();
void saveDefaultHost();

void setup() {
  Serial.begin(115200);
  delay(300);

  initPins();
  loadSettings();
  initDisplay();
  initBusesAndDevices();
  ensureSdFiles();
  randomSeed((uint32_t) esp_random());

  startInstallPortal();
  logEvent("BOOT", "Device booted. AP available at 192.168.4.1");

  if (wifiSsid.length() > 0) {
    connectToSavedWifi();
    if (wifiReady) {
      syncClock();
      checkApiStatus();
      fetchAndCacheUsers();
    } else {
      drawScreen("Offline Mode", "WiFi unavailable", "AP: 192.168.4.1", "Saved locally", ILI9341_YELLOW);
      logEvent("WIFI", "Saved WiFi failed to connect; appliance remains available on AP");
      delay(1200);
    }
  } else {
    drawScreen("FRANCIS KEY", "AP Ready", "192.168.4.1", "WiFi not configured", ILI9341_CYAN);
    logEvent("WIFI", "No saved WiFi; appliance started in AP plus offline mode");
    delay(1200);
  }

  mode = MODE_HOME;
  drawHomeScreen();
}

void loop() {
  server.handleClient();
  dnsServer.processNextRequest();

  maintainWifi();

  const uint32_t nowMs = millis();
  if (nowMs - lastApiCheckAt > API_CHECK_INTERVAL_MS) {
    checkApiStatus();
    if (mode == MODE_HOME && homeScreenVisible) {
      drawStatusFooter();
    }
    lastApiCheckAt = nowMs;
  }

  if (nowMs - lastSyncAt > OFFLINE_SYNC_INTERVAL_MS) {
    syncOfflineRecords();
    lastSyncAt = nowMs;
  }

  if (mode == MODE_REGISTER_FINGERPRINT || mode == MODE_REGISTER_RFID) {
    runRegistrationWorkflow();
    return;
  }

  runAttendanceWorkflow();

  if (mode == MODE_HOME && !homeScreenVisible) {
    drawHomeScreen();
    lastHomeUpdateAt = nowMs;
  } else if (mode == MODE_HOME && nowMs - lastHomeUpdateAt > 1000) {
    updateHomeClock(false);
    drawHomeNetworkLine(false);
    lastHomeUpdateAt = nowMs;
  }
}

void initPins() {
  pinMode(TFT_CS_PIN, OUTPUT);
  pinMode(SD_CS_PIN, OUTPUT);
  deselectSpiDevices();

  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, HIGH);
}

void loadSettings() {
  prefs.begin(PREF_NAMESPACE, false);
  wifiSsid = prefs.getString("ssid", "");
  wifiPassword = prefs.getString("pass", "");
  apiKey = prefs.getString("apiKey", DEFAULT_API_KEY);
  deviceId = prefs.getString("devId", DEFAULT_DEVICE_ID);
  adminUser = prefs.getString("adminUser", DEFAULT_ADMIN_USER);
  adminPassword = prefs.getString("adminPass", DEFAULT_ADMIN_PASSWORD);
  studentInMinutes = prefs.getUShort("inMin", DEFAULT_STUDENT_IN_MINUTES);
  outDelayMinutes = prefs.getUShort("outDelay", DEFAULT_OUT_DELAY_MINUTES);
  if (!(outDelayMinutes == 1 || outDelayMinutes == 5 || outDelayMinutes == 10 ||
        outDelayMinutes == 15 || outDelayMinutes == 30 || outDelayMinutes == 60)) {
    outDelayMinutes = DEFAULT_OUT_DELAY_MINUTES;
  }

  // Load API host with backward compatibility for existing installs
  apiHost = prefs.getString("apiHost", "");
  if (apiHost.length() == 0) {
    String savedUrl = prefs.getString("apiUrl", "");
    if (savedUrl.length() > 0) {
      if (savedUrl.startsWith("http://")) {
        savedUrl = savedUrl.substring(7);
      }
      int suffixPos = savedUrl.indexOf("/fingerprint/api/device.php");
      if (suffixPos > 0) {
        apiHost = savedUrl.substring(0, suffixPos);
      }
    }
    if (apiHost.length() == 0) {
      apiHost = String(DEFAULT_API_HOST);
    }
  }
  apiUrl = String("http://") + apiHost + "/fingerprint/api/device.php";
  defaultApiHost = prefs.getString("defApiHost", apiHost);
}

void saveSettings() {
  prefs.putString("apiUrl", apiUrl);
  prefs.putString("apiKey", apiKey);
  prefs.putString("devId", deviceId);
  prefs.putString("adminUser", adminUser);
  prefs.putString("adminPass", adminPassword);
  prefs.putString("apiHost", apiHost);
}

void saveDefaultHost() {
  defaultApiHost = apiHost;
  prefs.putString("defApiHost", defaultApiHost);
}

void saveRules() {
  prefs.putUShort("inMin", studentInMinutes);
  prefs.putUShort("outDelay", outDelayMinutes);
}

void initDisplay() {
  SPI.begin(SPI_SCLK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN);
  beginTftAccess();
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tftReady = true;
  drawScreen("FRANCIS KEY", "Starting Device", "Please wait", "", ILI9341_CYAN);
}

void initBusesAndDevices() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  beginSdAccess();
  Serial.println(F("[INIT] Initializing SD card..."));
  Serial.printf("[INIT]   Heap before SD.begin: %u free\n", ESP.getFreeHeap());
  sdReady = SD.begin(SD_CS_PIN, SPI);
  endSdAccess();
  if (sdReady) {
    uint8_t ct = SD.cardType();
    uint64_t sz = SD.cardSize() / (1024 * 1024);
    Serial.printf("[INIT]   SD OK - cardType=%u size=%llu MB\n", ct, sz);
  } else {
    Serial.println(F("[INIT]   SD FAILED to initialize!"));
  }

  rtcReady = rtc.begin();
  if (rtcReady && rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX_PIN, FINGERPRINT_TX_PIN);
  finger.begin(57600);
  fingerprintReady = finger.verifyPassword();

  nfc.begin();
  uint32_t pn532Version = nfc.getFirmwareVersion();
  nfcReady = pn532Version != 0;
  if (nfcReady) {
    nfc.SAMConfig();
  }

  Serial.printf("[INIT] Devices: SD=%s RTC=%s FP=%s NFC=%s TFT=%s\n",
                sdReady ? "OK" : "NO", rtcReady ? "OK" : "NO",
                fingerprintReady ? "OK" : "NO", nfcReady ? "OK" : "NO",
                tftReady ? "OK" : "NO");
}

void deselectSpiDevices() {
  digitalWrite(TFT_CS_PIN, HIGH);
  digitalWrite(SD_CS_PIN, HIGH);
  delayMicroseconds(1);
}

// TFT and microSD share SPI.  Each library manages its own CS line, but
// the SPI peripheral (clock / mode / frequency) must be clean before
// switching devices.  SPI.endTransaction() reverts any settings left by
// the previous device so the next one starts with a known-good bus state.
void beginTftAccess() {
  SPI.endTransaction();
  digitalWrite(SD_CS_PIN, HIGH);
  digitalWrite(TFT_CS_PIN, HIGH);
  delayMicroseconds(1);
}

void beginSdAccess() {
  // Hard-reset SPI bus: end any TFT transaction, then re-init SPI at SD-safe speed.
  SPI.endTransaction();
  digitalWrite(TFT_CS_PIN, HIGH);
  digitalWrite(SD_CS_PIN, HIGH);
  delayMicroseconds(10);
  // Re-initialise SPI with conservative settings so the SD library starts clean.
  SPI.begin(SPI_SCLK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN);
  delayMicroseconds(10);
}

void endSdAccess() {
  digitalWrite(SD_CS_PIN, HIGH);
  SPI.endTransaction();
  delayMicroseconds(10);
}

bool sdFileExists(const char *path) {
  if (!sdReady) {
    Serial.printf("[SD] sdFileExists(%s) -> false (sdReady=false)\n", path);
    return false;
  }

  beginSdAccess();
  bool exists = SD.exists(path);
  endSdAccess();
  Serial.printf("[SD] sdFileExists(%s) -> %s\n", path, exists ? "true" : "false");
  return exists;
}

File openSdFile(const char *path, const char *mode) {
  Serial.printf("[SD] openSdFile(%s, %s) called | heap free: %u\n", path, mode, ESP.getFreeHeap());
  beginSdAccess();
  File file = SD.open(path, mode);
  if (!file) {
    Serial.printf("[SD] openSdFile(%s, %s) FAILED | heap free: %u | sdReady=%s\n",
                  path, mode, ESP.getFreeHeap(), sdReady ? "true" : "false");
    // Print card type to help diagnose
    uint8_t ct = SD.cardType();
    Serial.printf("[SD]   cardType=%u (NONE=0,MMC=1,SD=2,SDHC=3)\n", ct);
    endSdAccess();
  } else {
    Serial.printf("[SD] openSdFile(%s, %s) OK\n", path, mode);
  }
  return file;
}

void closeSdFile(File &file) {
  if (file) {
    Serial.println(F("[SD] closeSdFile() closing file"));
    file.close();
  }
  endSdAccess();
}

bool removeSdFile(const char *path) {
  if (!sdReady) {
    Serial.printf("[SD] removeSdFile(%s) -> false (sdReady=false)\n", path);
    return false;
  }

  beginSdAccess();
  bool removed = SD.remove(path);
  endSdAccess();
  Serial.printf("[SD] removeSdFile(%s) -> %s\n", path, removed ? "true" : "false");
  return removed;
}

bool renameSdFile(const char *fromPath, const char *toPath) {
  if (!sdReady) {
    Serial.printf("[SD] renameSdFile(%s -> %s) -> false (sdReady=false)\n", fromPath, toPath);
    return false;
  }

  beginSdAccess();
  bool renamed = SD.rename(fromPath, toPath);
  endSdAccess();
  Serial.printf("[SD] renameSdFile(%s -> %s) -> %s\n", fromPath, toPath, renamed ? "true" : "false");
  return renamed;
}

void startInstallPortal() {
  IPAddress apIp(AP_IP_OCTET_1, AP_IP_OCTET_2, AP_IP_OCTET_3, AP_IP_OCTET_4);
  IPAddress gateway(AP_IP_OCTET_1, AP_IP_OCTET_2, AP_IP_OCTET_3, AP_IP_OCTET_4);
  IPAddress subnet(255, 255, 255, 0);

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIp, gateway, subnet);
  WiFi.softAP(INSTALL_AP_SSID, INSTALL_AP_PASSWORD);
  delay(250);

  Serial.println();
  Serial.println(F("Francis Key appliance AP started"));
  Serial.print(F("Connect to WiFi SSID: "));
  Serial.println(INSTALL_AP_SSID);
  Serial.print(F("Admin URL: http://"));
  Serial.println(WiFi.softAPIP());

  dnsServer.start(53, "*", WiFi.softAPIP());
  setupDeviceRoutes();
  server.begin();
}

void setupPortalRoutes() {
  setupDeviceRoutes();
}

void setupDeviceRoutes() {
  const char *headerKeys[] = {"Cookie"};
  server.collectHeaders(headerKeys, 1);

  server.on("/", HTTP_GET, handleAppRoot);
  server.on("/admin", HTTP_GET, handleAppRoot);
  server.on("/login", HTTP_POST, handleLoginPost);
  server.on("/logout", HTTP_GET, handleLogout);

  server.on("/api/state", HTTP_GET, handleApiState);
  server.on("/api/students", HTTP_GET, handleApiStudents);
  server.on("/api/register/start", HTTP_POST, handleApiRegisterStart);
  server.on("/api/register/status", HTTP_GET, handleApiRegisterStatus);
  server.on("/api/register/cancel", HTTP_POST, handleApiRegisterCancel);
  server.on("/api/attendance", HTTP_GET, handleApiAttendance);
  server.on("/api/users", HTTP_GET, handleApiUsers);
  server.on("/api/wifi/scan", HTTP_GET, handleApiWifiScan);
  server.on("/api/wifi/save", HTTP_POST, handleApiWifiSave);
  server.on("/api/rules", HTTP_GET, handleApiRules);
  server.on("/api/rules", HTTP_POST, handleApiRules);
  server.on("/api/logs", HTTP_GET, handleApiLogs);
  server.on("/api/backup/settings", HTTP_GET, handleApiBackupSettings);
  server.on("/api/backup/file", HTTP_GET, handleApiBackupFile);
  server.on("/api/restore/settings", HTTP_POST, handleApiRestoreSettings);
  server.on("/api/restore/file", HTTP_POST, handleApiRestoreFile);
  server.on("/api/sd/file", HTTP_GET, handleApiSdFile);
  server.on("/api/cache/clear", HTTP_POST, handleApiCacheClear);
  server.on("/api/time/set", HTTP_POST, handleApiTimeSet);
  server.on("/api/wifi/reset", HTTP_POST, handleApiWifiReset);
  server.on("/api/wifi/status", HTTP_GET, handleApiWifiStatus);
  server.on("/api/settings/api", HTTP_GET, handleApiSettingsApi);
  server.on("/api/settings/api", HTTP_POST, handleApiSettingsApi);

  server.on("/generate_204", HTTP_GET, redirectToRoot);
  server.on("/fwlink", HTTP_GET, redirectToRoot);
  server.on("/hotspot-detect.html", HTTP_GET, redirectToRoot);
  server.onNotFound(handleAppRoot);
}

void connectToSavedWifi() {
  drawScreen("WiFi", "Connecting...", wifiSsid, "Please wait", ILI9341_BLUE);
  wifiReady = connectToWifi(wifiSsid, wifiPassword, WIFI_CONNECT_TIMEOUT_MS);
  if (wifiReady) {
    printNetworkInfo("WiFi connected");
    drawScreen("WiFi Connected", "IP Address", WiFi.localIP().toString(), "FRANCIS KEY", ILI9341_GREEN);
    delay(1800);
  }
}

bool connectToWifi(const String &ssid, const String &password, uint32_t timeoutMs) {
  WiFi.mode(WIFI_AP_STA);
  wifiState = WIFI_STATE_CONNECTING;
  WiFi.begin(ssid.c_str(), password.c_str());

  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < timeoutMs) {
    dnsServer.processNextRequest();
    yield();
    delay(250);
  }
  const bool connected = WiFi.status() == WL_CONNECTED;
  wifiState = connected ? WIFI_STATE_CONNECTED : WIFI_STATE_CONNECTION_FAILED;
  if (connected) {
    printNetworkInfo("WiFi connected");
  }
  return connected;
}

void serviceWeb() {
  server.handleClient();
  dnsServer.processNextRequest();
  yield();
}

void syncClock() {
  if (!wifiReady) {
    return;
  }

  configTzTime(TIMEZONE_POSIX, NTP_SERVER_1, NTP_SERVER_2);

  struct tm timeInfo;
  if (getLocalTime(&timeInfo, 10000)) {
    if (rtcReady) {
      rtc.adjust(DateTime(
        timeInfo.tm_year + 1900,
        timeInfo.tm_mon + 1,
        timeInfo.tm_mday,
        timeInfo.tm_hour,
        timeInfo.tm_min,
        timeInfo.tm_sec
      ));
    }
  }
}

DateTime currentDateTime() {
  struct tm timeInfo;
  if (getLocalTime(&timeInfo, 50)) {
    return DateTime(
      timeInfo.tm_year + 1900,
      timeInfo.tm_mon + 1,
      timeInfo.tm_mday,
      timeInfo.tm_hour,
      timeInfo.tm_min,
      timeInfo.tm_sec
    );
  }

  if (rtcReady) {
    return rtc.now();
  }

  return DateTime(2026, 6, 26, 13, 0, 0);
}

String formatDate(const DateTime &dt) {
  static const char *months[] = {
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  };
  char buffer[32];
  snprintf(buffer, sizeof(buffer), "%s %02d, %04d", months[dt.month() - 1], dt.day(), dt.year());
  return String(buffer);
}

String formatTime12(const DateTime &dt) {
  uint8_t hour = dt.hour();
  const bool isPm = hour >= 12;
  uint8_t hour12 = hour % 12;
  if (hour12 == 0) {
    hour12 = 12;
  }

  char buffer[16];
  snprintf(buffer, sizeof(buffer), "%02d:%02d %s", hour12, dt.minute(), isPm ? "PM" : "AM");
  return String(buffer);
}

String formatDay(const DateTime &dt) {
  static const char *days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
  return String(days[dt.dayOfTheWeek()]);
}

String isoNow() {
  DateTime dt = currentDateTime();
  char buffer[32];
  snprintf(buffer, sizeof(buffer), "%04d-%02d-%02dT%02d:%02d:%02d+08:00",
           dt.year(), dt.month(), dt.day(), dt.hour(), dt.minute(), dt.second());
  return String(buffer);
}

String minutesToTimeInput(uint16_t minutes) {
  char buffer[6];
  snprintf(buffer, sizeof(buffer), "%02u:%02u", minutes / 60, minutes % 60);
  return String(buffer);
}

uint16_t timeInputToMinutes(String value, uint16_t fallback) {
  value.trim();
  int colon = value.indexOf(':');
  if (colon <= 0) {
    return fallback;
  }
  int hour = value.substring(0, colon).toInt();
  int minute = value.substring(colon + 1).toInt();
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }
  return (uint16_t) (hour * 60 + minute);
}

void setUiState(const String &type, const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent) {
  uiState.seq++;
  uiState.type = type;
  uiState.title = title;
  uiState.line1 = line1;
  uiState.line2 = line2;
  uiState.line3 = line3;
  uiState.accent = accent;
  uiState.updatedAt = millis();
}

void drawScreen(const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent) {
  String type = "info";
  if (accent == ILI9341_GREEN) {
    type = "success";
  } else if (accent == ILI9341_RED) {
    type = "error";
  } else if (accent == ILI9341_YELLOW) {
    type = "offline";
  } else if (title.indexOf("Registration") >= 0 || title.indexOf("Fingerprint") >= 0 || title.indexOf("RFID") >= 0) {
    type = "registration";
  } else if (title.indexOf("Attendance") >= 0) {
    type = "attendance";
  }
  setUiState(type, title, line1, line2, line3, accent);

  if (!tftReady) {
    return;
  }

  beginTftAccess();
  homeScreenVisible = false;
  tft.fillScreen(ILI9341_BLACK);
  tft.fillRect(0, 0, 320, 36, accent);
  tft.setTextColor(ILI9341_BLACK);
  tft.setTextSize(2);
  tft.setCursor(12, 10);
  tft.print(title);

  drawCentered(72, line1, ILI9341_WHITE, 2);
  drawCentered(112, line2, accent, 2);
  drawCentered(152, line3, ILI9341_LIGHTGREY, 2);
  drawStatusFooter();
}

void drawInstallScreen() {
  setUiState("setup", "FRANCIS KEY", "AP Ready", "192.168.4.1", "Password: 12345678", ILI9341_YELLOW);
  beginTftAccess();
  homeScreenVisible = false;
  tft.fillScreen(ILI9341_BLACK);
  drawCentered(42, "Device is not installed", ILI9341_RED, 2);
  drawCentered(82, "Please install before use", ILI9341_WHITE, 2);
  drawCentered(130, "Open WiFi and connect to:", ILI9341_LIGHTGREY, 2);
  drawCentered(170, INSTALL_AP_SSID, ILI9341_YELLOW, 3);
  drawCentered(214, "Password: 12345678", ILI9341_LIGHTGREY, 2);
}

void drawHomeScreen() {
  setUiState(wifiReady ? "ready" : "offline", "FRANCIS KEY", "Attendance Ready", "AP: 192.168.4.1", wifiReady ? WiFi.localIP().toString() : "Offline Mode", wifiReady ? ILI9341_GREEN : ILI9341_YELLOW);
  beginTftAccess();
  homeScreenVisible = true;
  lastHomeDateText = "";
  lastHomeTimeText = "";
  lastHomeDayText = "";
  lastHomeIpText = "";

  tft.fillScreen(ILI9341_BLACK);

  updateHomeClock(true);

  tft.drawRoundRect(18, 136, 284, 58, 8, ILI9341_DARKGREY);
  drawCentered(154, "FRANCIS KEY", ILI9341_GREEN, 2);

  drawHomeNetworkLine(true);
  drawStatusFooter();
}

void updateHomeClock(bool force) {
  beginTftAccess();
  DateTime now = currentDateTime();
  String dateText = formatDate(now);
  String timeText = formatTime12(now);
  String dayText = formatDay(now);

  if (force || dateText != lastHomeDateText) {
    tft.fillRect(0, 14, 320, 26, ILI9341_BLACK);
    drawCentered(20, dateText, ILI9341_WHITE, 2);
    lastHomeDateText = dateText;
  }

  if (force || timeText != lastHomeTimeText) {
    tft.fillRect(0, 52, 320, 38, ILI9341_BLACK);
    drawCentered(58, timeText, ILI9341_CYAN, 3);
    lastHomeTimeText = timeText;
  }

  if (force || dayText != lastHomeDayText) {
    tft.fillRect(0, 96, 320, 26, ILI9341_BLACK);
    drawCentered(102, dayText, ILI9341_LIGHTGREY, 2);
    lastHomeDayText = dayText;
  }
}

void drawHomeNetworkLine(bool force) {
  beginTftAccess();
  String line = wifiReady ? "STA: " + WiFi.localIP().toString() : "AP: 192.168.4.1";

  if (!force && line == lastHomeIpText) {
    return;
  }

  tft.fillRect(0, 198, 320, 16, ILI9341_BLACK);
  drawCentered(202, line, wifiReady ? ILI9341_LIGHTGREY : ILI9341_RED, 1);
  lastHomeIpText = line;
}

void drawStatusFooter() {
  beginTftAccess();
  tft.fillRect(0, 216, 320, 24, ILI9341_NAVY);
  tft.setTextSize(1);
  tft.setTextColor(wifiReady ? ILI9341_GREEN : ILI9341_RED);
  tft.setCursor(8, 224);
  tft.print(wifiReady ? "WiFi:OK" : "WiFi:OFF");

  tft.setTextColor(databaseReady ? ILI9341_GREEN : ILI9341_RED);
  tft.setCursor(112, 224);
  tft.print(databaseReady ? "DB:OK" : "DB:OFF");

  tft.setTextColor(sdReady ? ILI9341_GREEN : ILI9341_RED);
  tft.setCursor(214, 224);
  tft.print(sdReady ? "SD:OK" : "SD:OFF");
}

void drawCentered(int y, const String &text, uint16_t color, uint8_t size) {
  beginTftAccess();
  tft.setTextSize(size);
  tft.setTextColor(color);
  int16_t x1;
  int16_t y1;
  uint16_t w;
  uint16_t h;
  tft.getTextBounds(text, 0, y, &x1, &y1, &w, &h);
  int x = max(0, (320 - (int) w) / 2);
  tft.setCursor(x, y);
  tft.print(text);
}

void printNetworkInfo(const String &context) {
  Serial.println();
  Serial.println(context);
  Serial.print(F("SSID: "));
  Serial.println(WiFi.SSID());
  Serial.print(F("AP IP: "));
  Serial.println(WiFi.softAPIP());
  Serial.print(F("ESP32 IP: "));
  Serial.println(WiFi.localIP());
  Serial.println(F("Admin URL: http://192.168.4.1/"));
}

void signalFingerprint() {
  pulseLed(BLUE_LED_PIN, 1000);
  buzz(90);
}

void signalRfid() {
  pulseLed(YELLOW_LED_PIN, 1000);
  buzz(90);
}

void signalSuccess() {
  digitalWrite(GREEN_LED_PIN, HIGH);
  buzz(100, 80);
  buzz(120);
  delay(500);
  digitalWrite(GREEN_LED_PIN, LOW);
}

void signalError() {
  digitalWrite(RED_LED_PIN, HIGH);
  buzz(900);
  delay(350);
  digitalWrite(RED_LED_PIN, LOW);
}

void signalUnauthorized() {
  digitalWrite(RED_LED_PIN, HIGH);
  buzz(500, 160);
  buzz(500, 160);
  buzz(500);
  digitalWrite(RED_LED_PIN, LOW);
}

void pulseLed(uint8_t pin, uint16_t durationMs) {
  digitalWrite(pin, HIGH);
  delay(durationMs);
  digitalWrite(pin, LOW);
}

void buzz(uint16_t durationMs, uint16_t pauseMs) {
  digitalWrite(BUZZER_PIN, LOW);
  delay(durationMs);
  digitalWrite(BUZZER_PIN, HIGH);
  if (pauseMs > 0) {
    delay(pauseMs);
  }
}

String htmlPage(const String &title, const String &body) {
  String page;
  page.reserve(body.length() + 1400);
  page += F("<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>");
  page += F("<title>");
  page += htmlEscape(title);
  page += F("</title><style>");
  page += F("body{margin:0;font-family:Arial,sans-serif;background:#080b10;color:#ecfeff}");
  page += F("main{max-width:860px;margin:0 auto;padding:24px}a{color:#67e8f9}");
  page += F(".card{border:1px solid #1f2937;background:#101720;border-radius:8px;padding:18px;margin:14px 0}");
  page += F("input,select,button{width:100%;box-sizing:border-box;padding:12px;margin:8px 0;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff}");
  page += F("button{background:#0891b2;border:0;font-weight:700;cursor:pointer}.danger{background:#dc2626}.ok{color:#22c55e}.bad{color:#ef4444}");
  page += F("table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #1f2937;padding:8px;text-align:left}");
  page += F("pre{white-space:pre-wrap;word-break:break-word;overflow:auto}");
  page += F("</style></head><body><main><h1>");
  page += htmlEscape(title);
  page += F("</h1>");
  page += body;
  page += F("</main></body></html>");
  return page;
}

String htmlEscape(String value) {
  value.replace("&", "&amp;");
  value.replace("<", "&lt;");
  value.replace(">", "&gt;");
  value.replace("\"", "&quot;");
  value.replace("'", "&#39;");
  return value;
}

String jsonEscape(String value) {
  value.replace("\\", "\\\\");
  value.replace("\"", "\\\"");
  value.replace("\r", "\\r");
  value.replace("\n", "\\n");
  value.replace("\t", "\\t");
  return value;
}

String cookieValue(const String &name) {
  String cookie = server.header("Cookie");
  int start = cookie.indexOf(name + "=");
  if (start < 0) {
    return "";
  }
  start += name.length() + 1;
  int end = cookie.indexOf(';', start);
  if (end < 0) {
    end = cookie.length();
  }
  String value = cookie.substring(start, end);
  value.trim();
  return value;
}

bool isAuthenticated() {
  if (sessionToken.length() == 0) {
    return false;
  }
  if ((int32_t) (millis() - sessionExpiresAt) > 0) {
    clearSession();
    return false;
  }
  if (cookieValue(SESSION_COOKIE_NAME) != sessionToken) {
    return false;
  }
  sessionExpiresAt = millis() + SESSION_TIMEOUT_MS;
  return true;
}

void beginSession() {
  sessionToken = String((uint32_t) esp_random(), HEX) + String(millis(), HEX) + String((uint32_t) ESP.getEfuseMac(), HEX);
  sessionExpiresAt = millis() + SESSION_TIMEOUT_MS;
  server.sendHeader("Set-Cookie", String(SESSION_COOKIE_NAME) + "=" + sessionToken + "; Path=/; SameSite=Lax");
}

void clearSession() {
  sessionToken = "";
  sessionExpiresAt = 0;
}

void sendJson(int status, const String &payload) {
  server.sendHeader("Cache-Control", "no-store");
  server.send(status, "application/json", payload);
}

bool requireApiAdmin() {
  if (isAuthenticated()) {
    return true;
  }
  sendJson(401, "{\"ok\":false,\"error\":\"Login required.\"}");
  return false;
}

bool requireAdmin() {
  if (isAuthenticated()) {
    return true;
  }

  sendLoginPage();
  return false;
}

void redirectToRoot() {
  server.sendHeader("Location", "/", true);
  server.send(302, "text/plain", "");
}

void sendLoginPage(const String &message) {
  String body;
  body.reserve(4800);
  body += F("<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>");
  body += F("<title>Francis Key Login</title><style>");
  body += F(":root{--bg:#0b1218;--panel:#131d26;--line:#284150;--text:#f5fbff;--muted:#9cb1bd;--brand:#25c3b8;--bad:#ef6b6b}*{box-sizing:border-box}body{margin:0;min-height:100dvh;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(145deg,#071017,#101d26);color:var(--text);display:grid;place-items:center;padding:18px}.login{width:min(420px,100%);border:1px solid var(--line);background:rgba(19,29,38,.94);border-radius:8px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.35)}h1{margin:0 0 4px;font-size:28px}p{color:var(--muted);line-height:1.5}.brand{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);font-weight:800}label{display:block;margin:16px 0 6px;color:#dbe8ed;font-size:13px;font-weight:700}input,button{width:100%;border-radius:8px;border:1px solid var(--line);padding:13px 14px;background:#0d151d;color:var(--text);font:inherit}button{margin-top:18px;background:var(--brand);border:0;color:#061012;font-weight:800;cursor:pointer}.msg{border:1px solid rgba(239,107,107,.35);background:rgba(239,107,107,.1);color:#ffd5d5;border-radius:8px;padding:10px;margin-top:16px}.foot{font-size:12px}</style></head><body><main class='login'>");
  body += F("<div class='brand'>Francis Key Appliance</div><h1>Admin Login</h1><p>Connect to <b>FRANCIS_KEY</b> and manage the attendance device at <b>192.168.4.1</b>.</p>");
  if (message.length()) {
    body += F("<div class='msg'>");
    body += htmlEscape(message);
    body += F("</div>");
  }
  body += F("<form method='post' action='/login'><label>Username</label><input name='username' autocomplete='username' required><label>Password</label><input name='password' type='password' autocomplete='current-password' required><button type='submit'>Login</button></form><p class='foot'>Default: admin / francis123</p></main></body></html>");
  server.send(200, "text/html", body);
}

void sendAppShell() {
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "text/html", "");
  server.sendContent(F(R"APPHTML(
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Francis Key Device</title>
<style>
:root{--bg:#f3f7f9;--panel:#ffffff;--panel2:#edf4f6;--ink:#17242d;--muted:#5c7180;--line:#d8e3e8;--brand:#0f9f94;--brand2:#106b77;--good:#16845b;--warn:#b7791f;--bad:#c24141;--shadow:0 16px 42px rgba(23,36,45,.12)}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--ink)}button,input,select,textarea{font:inherit}button{cursor:pointer}.app{display:grid;min-height:100dvh}.sidebar{position:fixed;inset:0 auto 0 0;z-index:30;width:280px;transform:translateX(-105%);transition:.2s ease;background:#0c1820;color:#f6fbff;padding:16px;box-shadow:var(--shadow)}.sidebar.open{transform:none}.brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:8px;background:linear-gradient(135deg,var(--brand),#79e5dc);color:#06201e;font-weight:900}.brand b{display:block;font-size:20px}.brand span{font-size:12px;color:#adc2ca}.nav{display:grid;gap:6px}.nav button{display:flex;align-items:center;gap:10px;border:0;border-radius:8px;background:transparent;color:#cfe0e7;padding:11px 12px;text-align:left}.nav button.active,.nav button:hover{background:rgba(121,229,220,.12);color:white}.main{min-width:0}.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(243,247,249,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}.iconbtn{width:42px;height:42px;border-radius:8px;border:1px solid var(--line);background:var(--panel);display:grid;place-items:center}.title{font-weight:850}.sub{color:var(--muted);font-size:12px}.content{padding:14px;display:grid;gap:14px}.grid{display:grid;gap:12px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;box-shadow:var(--shadow)}.card h2{margin:0 0 10px;font-size:18px}.stat{display:grid;gap:6px}.stat span{font-size:12px;color:var(--muted)}.stat b{font-size:24px}.screen{background:#0b1218;color:#effcff;border-radius:8px;padding:16px;min-height:132px;display:grid;align-content:center;gap:6px}.screen .kind{text-transform:uppercase;font-size:12px;letter-spacing:.14em;color:#7ce4dc}.screen .big{font-size:23px;font-weight:850}.screen .line{color:#c0d0d7}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:12px;border:1px solid var(--line);background:var(--panel2)}.ok{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}.btn{border:0;border-radius:8px;padding:11px 13px;background:var(--brand);color:white;font-weight:800}.btn.secondary{background:#dfe9ed;color:var(--ink)}.btn.danger{background:var(--bad)}.btn:disabled{opacity:.62;cursor:not-allowed}.field{display:grid;gap:6px;margin:10px 0}.field label{font-size:13px;color:var(--muted);font-weight:800}.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:11px;background:white;color:var(--ink)}.field textarea{min-height:130px;resize:vertical}.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:8px}table{width:100%;border-collapse:collapse;background:var(--panel);font-size:13px}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}th{background:#edf4f6;color:#445b68}.list{display:grid;gap:8px}.item{border:1px solid var(--line);background:white;border-radius:8px;padding:12px;text-align:left}.item:hover{border-color:var(--brand)}.muted{color:var(--muted)}.empty{padding:16px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);background:#fbfdfe}.modalbg{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(7,14,19,.58);padding:14px}.modalbg.show{display:grid}.modal{width:min(520px,100%);background:var(--panel);border-radius:8px;border:1px solid var(--line);box-shadow:0 32px 90px rgba(0,0,0,.28);padding:16px}.toast{position:fixed;left:14px;right:14px;bottom:14px;z-index:50;display:none;background:#0c1820;color:white;border-radius:8px;padding:13px 14px;box-shadow:var(--shadow)}.toast.show{display:block}.overlay{position:fixed;inset:0;z-index:25;background:rgba(7,14,19,.36);display:none}.overlay.show{display:block}.loader{height:12px;border-radius:999px;background:linear-gradient(90deg,#dce8ed,#f8fbfc,#dce8ed);background-size:200% 100%;animation:load 1s infinite}@keyframes load{to{background-position:-200% 0}}@media(min-width:920px){.app{grid-template-columns:280px minmax(0,1fr)}.sidebar{position:sticky;transform:none;height:100dvh}.overlay,.menu{display:none}.content{padding:18px}.cards{grid-template-columns:repeat(4,minmax(0,1fr))}.wide{grid-template-columns:1.05fr .95fr}}
</style>
</head>
<body>
<div class="overlay" id="overlay"></div>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="mark">FK</div><div><b>FRANCIS KEY</b><span>Attendance Appliance</span></div></div>
    <nav class="nav" id="nav"></nav>
  </aside>
  <main class="main">
    <header class="topbar">
      <button class="iconbtn menu" id="menuBtn" title="Menu">=</button>
      <button class="iconbtn" id="backBtn" title="Back">&lt;</button>
      <div><div class="title" id="pageTitle">Dashboard</div><div class="sub">AP: 192.168.4.1</div></div>
    </header>
    <section class="content" id="content"></section>
  </main>
</div>
<div class="modalbg" id="modalBg"><div class="modal" id="modal"></div></div>
<div class="toast" id="toast"></div>
<script>
const menu=["Dashboard","Attendance","Register User","Users","WiFi Settings","API Settings","Attendance Rules","Date/Time","Logs","Backup / Restore","Logout"];
const state={view:"Dashboard",device:null,students:[],attendance:[],users:[],logs:null,networks:[],loading:{},scanStatus:"",modalStudent:null,search:"",wifiStatus:null};
const $=id=>document.getElementById(id);
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3200)}
async function api(path,opt={}){const res=await fetch(path,{cache:"no-store",...opt});if(res.status===401){location.href="/";throw new Error("Login required")}const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch(e){throw new Error("Invalid device response")}if(!res.ok||data.ok===false)throw new Error(data.error||"Device request failed");return data}
function setLoading(k,v){state.loading[k]=v;render()}
function closeMenu(){$("sidebar").classList.remove("open");$("overlay").classList.remove("show")}
function openMenu(){$("sidebar").classList.add("open");$("overlay").classList.add("show")}
function nav(){const n=$("nav");n.innerHTML="";menu.forEach(name=>{const b=document.createElement("button");b.textContent=name;b.className=state.view===name?"active":"";b.onclick=()=>{if(name==="Logout"){location.href="/logout";return}state.view=name;closeMenu();render();loadView(name)};n.appendChild(b)})}
function shell(){nav();$("pageTitle").textContent=state.view;$("backBtn").style.visibility=state.view==="Dashboard"?"hidden":"visible"}
function statusPill(label,on){return `<span class="pill ${on?"ok":"bad"}">${label}: ${on?"OK":"OFF"}</span>`}
function deviceCards(){const d=state.device||{};return `<div class="grid cards"><div class="card stat"><span>WiFi</span><b class="${d.wifiReady?"ok":"bad"}">${d.wifiReady?"Online":"Offline"}</b></div><div class="card stat"><span>Database API</span><b class="${d.databaseReady?"ok":"bad"}">${d.databaseReady?"Ready":"Offline"}</b></div><div class="card stat"><span>SD Queue</span><b>${d.pendingQueue||0}</b></div><div class="card stat"><span>Device Time</span><b>${d.time||"--:--"}</b></div></div>`}
function liveScreen(){const u=(state.device&&state.device.ui)||{};return `<div class="screen"><div class="kind">${u.type||"state"}</div><div class="big">${u.title||"FRANCIS KEY"}</div><div class="line">${u.line1||""}</div><div class="line">${u.line2||""}</div><div class="line">${u.line3||""}</div></div>`}
function dashboard(){const d=state.device||{};return `${deviceCards()}<div class="grid wide"><div class="card"><h2>Live Device Screen</h2>${liveScreen()}<div class="row" style="margin-top:12px">${statusPill("Fingerprint",d.fingerprintReady)}${statusPill("RFID",d.nfcReady)}${statusPill("RTC",d.rtcReady)}${statusPill("TFT",d.tftReady)}${statusPill("SD",d.sdReady)}</div></div><div class="card"><h2>Appliance</h2><div class="field"><label>Access Point</label><div class="item"><b>FRANCIS_KEY</b><div class="muted">Password: 12345678 / IP: 192.168.4.1</div></div></div><div class="field"><label>Station IP</label><div>${d.staIp||"Offline"}</div></div><div class="field"><label>API URL</label><div class="muted">${d.apiUrl||""}</div></div></div></div>`}
function attendance(){if(state.loading.attendance)return `<div class="card"><div class="loader"></div></div>`;const rows=state.attendance.map(r=>`<tr><td>${r.date}</td><td>${r.time}</td><td>${r.id}</td><td>${r.name}</td><td>${r.status}</td></tr>`).join("");return `<div class="card"><div class="row"><h2 style="margin-right:auto">Recent Attendance</h2><button class="btn secondary" onclick="loadAttendance()">Refresh</button></div><div class="tablewrap"><table><thead><tr><th>Date</th><th>Time</th><th>ID</th><th>Name</th><th>Status</th></tr></thead><tbody>${rows||"<tr><td colspan=5>No local attendance records.</td></tr>"}</tbody></table></div></div>`}
function registerView(){const d=state.device||{};if(!d.wifiReady||!d.databaseReady)return `<div class="card"><h2>Register User</h2><div class="empty">Registration unavailable.<br>Please connect to WiFi.</div></div>`;const q=state.search.toLowerCase();const filtered=state.students.filter(s=>(`${s.idNumber} ${s.fullName}`.toLowerCase()).includes(q));const list=filtered.map(s=>`<button class="item" onclick="openRegister(${s.id})"><b>${s.idNumber||s.id}</b> ${s.fullName}<div class="muted">${s.department||"Student"}</div></button>`).join("");return `<div class="card"><div class="row"><h2 style="margin-right:auto">Select Student</h2><button class="btn secondary" onclick="loadStudents()">Refresh</button></div><div class="field"><label>Realtime Search</label><input placeholder="Student ID, first name, last name, full name" value="${state.search}" oninput="state.search=this.value;render()"></div>${state.loading.students?'<div class="loader"></div>':`<div class="list">${list||'<div class="empty">No matching students.</div>'}</div>`}</div>`}
function usersView(){if(state.loading.users)return `<div class="card"><div class="loader"></div></div>`;const rows=state.users.map(u=>`<tr><td>${u.idNumber||u.userId}</td><td>${u.fullName}</td><td>${u.fingerprintId||""}</td><td>${u.smartCardId||""}</td></tr>`).join("");return `<div class="card"><div class="row"><h2 style="margin-right:auto">Local User Cache</h2><button class="btn secondary" onclick="loadUsers()">Refresh</button></div><div class="tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Fingerprint</th><th>RFID</th></tr></thead><tbody>${rows||"<tr><td colspan=4>No cached users.</td></tr>"}</tbody></table></div></div>`}
function wifiView(){const ws=state.wifiStatus||{};const st=ws.status;const connected=st==="Connected";const authenticating=st==="Authenticating";const on=connected||authenticating;const connSsid=on?(ws.ssid||""):"Not Connected";const connBlock=`<div style="margin-bottom:12px;padding:10px 14px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:13px;color:var(--muted);font-weight:800">WiFi Connected:</span><span style="width:10px;height:10px;border-radius:50%;background:${on?"#16a34a":"#9ca3af"};display:inline-block"></span><b>${connSsid}</b></div>`;if(connected||authenticating){const clr=connected?"#16a34a":"#ca8a04";const lbl=connected?"Connected":"Authenticated";return `<div class="card"><div class="row"><h2 style="margin-right:auto">WiFi Settings</h2></div>${connBlock}<div style="padding:16px;border:1px solid ${connected?"#bbf7bb":"#fef08a"};border-radius:8px;background:${connected?"#f0faf0":"#fefce8"};margin-bottom:12px"><div class="field"><label>SSID</label><div class="item"><b>${ws.ssid||""}</b></div></div><div class="field"><label>Status</label><div style="display:flex;align-items:center;gap:8px"><span style="width:12px;height:12px;border-radius:50%;background:${clr};display:inline-block"></span><b style="color:${clr}">${lbl}</b></div></div>${authenticating?'<div class="field"><label style="color:#dc2626">Please reset WiFi</label></div>':''}</div><button class="btn danger" onclick="resetWifi()">Reset WiFi</button></div>`}const nets=state.networks.map(n=>`<option value="${n.ssid}">${n.ssid}</option>`).join("");const scanMsg=state.loading.scan?'Scanning WiFi...':state.scanStatus;const statusColor=st==="Connecting"||st==="Authenticating"?"#2563eb":st==="Scanning"||st==="Reconnecting"?"#ca8a04":"#dc2626";const statusDot=st&&st!=="Disconnected"&&st!=="Connection Failed"?`<div style="padding:12px;border:1px solid ${statusColor};border-radius:8px;background:white;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block"></span><span>${st}</span></div>`:"";return `<div class="card"><div class="row"><h2 style="margin-right:auto">WiFi Settings</h2><button class="btn secondary" onclick="scanWifi()">Scan Networks</button></div>${connBlock}${statusDot}${scanMsg?'<p style="margin:8px 0;color:var(--muted)">'+scanMsg+'</p>':""}<div class="field"><label>Network</label><select id="wifiSsid">${nets}</select></div><div class="field"><label>Password</label><input id="wifiPass" type="password" placeholder="WiFi password"></div><button class="btn" onclick="saveWifi()">Save and Connect</button><button class="btn danger" onclick="resetWifi()" style="margin-top:12px">Reset WiFi</button></div>`}
function rulesView(){const d=state.device||{}, r=d.rules||{};return `<div class="card"><h2>Attendance Rules</h2><div class="field"><label>Student IN Time</label><input type="time" id="inTime" value="${r.inTime||"10:00"}"></div><div class="field"><label>Student OUT Allowed After</label><select id="outDelay">${[1,5,10,15,30,60].map(v=>`<option value="${v}" ${Number(r.outDelay)===v?"selected":""}>${v} minute${v>1?"s":""}</option>`).join("")}</select></div><button class="btn" onclick="saveRules()">Save Rules</button></div>`}
function logsView(){if(state.loading.logs)return `<div class="card"><div class="loader"></div></div>`;const l=state.logs||{};return `<div class="grid"><div class="card"><div class="row"><h2 style="margin-right:auto">Device Logs</h2><button class="btn secondary" onclick="loadLogs()">Refresh</button></div><pre>${l.events||"No device log."}</pre></div><div class="card"><h2>Offline Sync Queue</h2><pre>${l.unsent||"No pending records."}</pre></div></div>`}
function backupView(){return `<div class="grid"><div class="card"><h2>Backup</h2><p class="muted">Download SD files and settings. Fingerprint templates remain inside the fingerprint sensor.</p><div class="row"><button class="btn" onclick="download('/api/backup/settings','francis-key-settings.json')">Settings</button><button class="btn secondary" onclick="download('/api/backup/file?name=attendance','attendance.csv')">Attendance</button><button class="btn secondary" onclick="download('/api/backup/file?name=users','users.psv')">Users</button><button class="btn secondary" onclick="download('/api/backup/file?name=queue','unsent.psv')">Queue</button><button class="btn secondary" onclick="download('/api/backup/file?name=logs','device.log')">Logs</button></div></div><div class="card"><h2>Restore Settings</h2><div class="field"><label>Settings JSON</label><textarea id="restoreSettings"></textarea></div><button class="btn danger" onclick="restoreSettings()">Restore Settings</button></div><div class="card"><h2>Restore SD File</h2><div class="field"><label>File</label><select id="restoreFile"><option value="attendance">Attendance CSV</option><option value="users">Users cache</option><option value="queue">Unsent queue</option><option value="logs">Device log</option></select></div><div class="field"><label>Content</label><textarea id="restoreContent"></textarea></div><button class="btn danger" onclick="restoreFile()">Restore File</button></div><div class="card"><h2>Clear All Cache</h2><p class="muted">⚠ Deletes all stored fingerprint templates from the sensor, user cache, attendance records, unsent queue, and device logs. This cannot be undone.</p><button class="btn danger" onclick="clearCache()">Clear All Cache</button></div></div>`}
function apiSettingsView(){return '<div class="card"><h2>API Settings</h2><form onsubmit="return false"><div class="field"><label>API URL</label><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="white-space:nowrap;color:var(--muted)">http://</span><input id="apiHost" value="'+(state.apiSettings?state.apiSettings.host:'')+'" style="flex:1;min-width:120px"><span style="white-space:nowrap;color:var(--muted)">/fingerprint/api/device.php</span></div></div><div style="padding:12px;background:var(--panel2);border-radius:8px;border:1px solid var(--line);margin:12px 0"><div style="font-size:13px;color:var(--muted)">Current API:</div><b style="word-break:break-all">'+(state.apiSettings?state.apiSettings.currentUrl:'')+'</b></div><div style="padding:12px;background:var(--panel2);border-radius:8px;border:1px solid var(--line);margin:12px 0"><div style="font-size:13px;color:var(--muted)">Default API:</div><b style="word-break:break-all">'+(state.apiSettings?state.apiSettings.defaultUrl:'')+'</b></div><div class="row"><button class="btn" onclick="saveApiHost()">Save</button><button class="btn secondary" onclick="makeApiDefault()">Make As Default</button><button class="btn secondary" onclick="resetApiHost()">Reset</button></div></form></div>'}
async function loadApiSettings(){try{state.apiSettings=await api("/api/settings/api")}catch(e){}}
async function saveApiHost(){const h=$("apiHost").value.trim();if(!h){toast("Please enter an IP address or domain");return}try{await api("/api/settings/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",host:h})});toast("API host saved.");loadApiSettings()}catch(e){toast(e.message)}}
async function makeApiDefault(){try{await api("/api/settings/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"default"})});toast("Default API host saved.");loadApiSettings()}catch(e){toast(e.message)}}
async function resetApiHost(){try{await api("/api/settings/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset"})});toast("API host reset to default.");loadApiSettings()}catch(e){toast(e.message)}}
function dateTimeView(){const d=state.device||{};const h24=d.rtcHour24!==undefined?d.rtcHour24:12;const h12=h24%12||12;const ampm=h24>=12?'PM':'AM';const m=d.rtcMonth||1;const dd=d.rtcDay||1;const y=d.rtcYear||2026;const min=d.rtcMinute||0;const mn=["January","February","March","April","May","June","July","August","September","October","November","December"];let ms='';for(let i=1;i<=12;i++)ms+='<option value="'+i+'"'+(i===m?' selected':'')+'>'+mn[i-1]+'</option>';let hs='';for(let i=1;i<=12;i++){const s=i<10?'0'+i:''+i;hs+='<option value="'+i+'"'+(i===h12?' selected':'')+'>'+s+'</option>'}let mins='';for(let i=0;i<60;i++){const s=i<10?'0'+i:''+i;mins+='<option value="'+s+'"'+(i===min?' selected':'')+'>'+s+'</option>'}return '<div class="card"><h2>Set Date & Time (Offline)</h2><p class="muted">Manually set the RTC date and time when the device is offline. All times are in 12-hour format.</p><div class="grid" style="grid-template-columns:1fr 1fr"><div class="field"><label>Year</label><input type="number" id="dtYear" min="2000" max="2099" value="'+y+'"></div><div class="field"><label>Month</label><select id="dtMonth">'+ms+'</select></div><div class="field"><label>Day</label><input type="number" id="dtDay" min="1" max="31" value="'+dd+'"></div><div class="field"><label>Hour</label><select id="dtHour">'+hs+'</select></div><div class="field"><label>Minute</label><select id="dtMinute">'+mins+'</select></div><div class="field"><label>AM/PM</label><select id="dtAmPm"><option value="AM"'+(ampm==='AM'?' selected':'')+'>AM</option><option value="PM"'+(ampm==='PM'?' selected':'')+'>PM</option></select></div></div><button class="btn" onclick="saveDateTime()">Set Date & Time</button><div style="margin-top:12px;padding:12px;background:#fbfdfe;border-radius:8px;border:1px solid var(--line)"><div class="muted">Current device time</div><b>'+d.date+' '+d.time+'</b></div></div>'}
async function saveDateTime(){const y=parseInt($("dtYear").value);const mo=parseInt($("dtMonth").value);const d=parseInt($("dtDay").value);const h12=parseInt($("dtHour").value);const mi=parseInt($("dtMinute").value);const pm=$("dtAmPm").value==="PM";if(!y||!mo||!d||!h12||mi===undefined){toast("Please fill all fields");return}if(d<1||d>31){toast("Day must be between 1 and 31");return}try{await api("/api/time/set",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({year:y,month:mo,day:d,hour12:h12,minute:mi,isPm:pm})});toast("Date and time updated.");loadState()}catch(e){toast(e.message)}}
function render(){shell();const v=state.view;let html=v==="Dashboard"?dashboard():v==="Attendance"?attendance():v==="Register User"?registerView():v==="Users"?usersView():v==="WiFi Settings"?wifiView():v==="API Settings"?apiSettingsView():v==="Attendance Rules"?rulesView():v==="Date/Time"?dateTimeView():v==="Logs"?logsView():backupView();$("content").innerHTML=html}
async function loadState(){try{state.device=await api("/api/state");render()}catch(e){console.log(e.message)}}
async function loadAttendance(){setLoading("attendance",true);try{state.attendance=(await api("/api/attendance")).records||[]}catch(e){toast(e.message)}setLoading("attendance",false)}
async function loadStudents(){setLoading("students",true);try{state.students=(await api("/api/students")).students||[]}catch(e){toast(e.message)}setLoading("students",false)}
async function loadUsers(){setLoading("users",true);try{state.users=(await api("/api/users")).users||[]}catch(e){toast(e.message)}setLoading("users",false)}
async function scanWifi(){setLoading("scan",true);try{const r=await api("/api/wifi/scan");state.networks=r.networks||[];state.scanStatus=state.networks.length?"Found "+state.networks.length+" 2.4GHz networks":"No 2.4GHz WiFi networks found."}catch(e){state.scanStatus="";toast(e.message)}setLoading("scan",false)}
async function loadLogs(){setLoading("logs",true);try{state.logs=await api("/api/logs")}catch(e){toast(e.message)}setLoading("logs",false)}
async function loadWifiStatus(){try{state.wifiStatus=await api("/api/wifi/status")}catch(e){}}
function loadView(v){if(v==="Attendance")loadAttendance();if(v==="Register User")loadStudents();if(v==="Users")loadUsers();if(v==="WiFi Settings"){loadWifiStatus();scanWifi()}if(v==="API Settings")loadApiSettings();if(v==="Date/Time")loadState();if(v==="Logs")loadLogs()}
function openRegister(id){state.modalStudent=state.students.find(s=>s.id===id);showRegisterModal()}
function showRegisterModal(){const s=state.modalStudent;if(!s)return;$("modal").innerHTML=`<h2>Register User</h2><div class="field"><label>Student ID</label><div class="item">${s.idNumber||s.id}</div></div><div class="field"><label>Full Name</label><div class="item">${s.fullName}</div></div><div class="item">Scan Fingerprint: follow TFT and browser status</div><div class="item">Scan RFID: follow TFT and browser status</div><div class="row" style="margin-top:12px"><button class="btn" onclick="startRegister()">Register</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div><div style="margin-top:12px">${liveScreen()}</div>`;$("modalBg").classList.add("show")}
function closeModal(){$("modalBg").classList.remove("show");api("/api/register/cancel",{method:"POST"}).catch(()=>{})}
async function startRegister(){try{const s=state.modalStudent;await api("/api/register/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:s.id})});toast("Registration started. Follow the device screen.");showRegisterModal()}catch(e){toast(e.message)}}
async function saveWifi(){if(!confirm("Save WiFi settings and connect now?"))return;const ssid=$("wifiSsid").value;if(!ssid){toast("Please select a WiFi network");return}try{await api("/api/wifi/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ssid:ssid,password:$("wifiPass").value})});toast("WiFi settings saved.");loadState()}catch(e){toast(e.message)}}
async function resetWifi(){if(!confirm("Reset WiFi? This will clear saved credentials and return to AP mode."))return;try{await api("/api/wifi/reset",{method:"POST"});toast("WiFi credentials cleared. Scanning networks...");state.networks=[];state.scanStatus="";scanWifi()}catch(e){toast(e.message)}}
async function saveRules(){try{await api("/api/rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inTime:$("inTime").value,outDelay:Number($("outDelay").value)})});toast("Attendance rules saved.");loadState()}catch(e){toast(e.message)}}
function download(url,name){const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}
async function restoreSettings(){if(!confirm("Restore settings from this JSON?"))return;try{await api("/api/restore/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:$("restoreSettings").value});toast("Settings restored.");loadState()}catch(e){toast(e.message)}}
async function restoreFile(){if(!confirm("Replace the selected SD file?"))return;try{await api(`/api/restore/file?name=${encodeURIComponent($("restoreFile").value)}`,{method:"POST",headers:{"Content-Type":"text/plain"},body:$("restoreContent").value});toast("File restored.")}catch(e){toast(e.message)}}
async function clearCache(){if(!confirm("Permanently delete ALL fingerprint templates and SD cache? This cannot be undone."))return;if(!confirm("Are you sure? All enrolled fingerprints will be erased from the sensor."))return;try{const r=await api("/api/cache/clear",{method:"POST"});toast("Cache cleared. ("+r.message+")");loadState()}catch(e){toast(e.message)}}
$("menuBtn").onclick=openMenu;$("overlay").onclick=closeMenu;$("backBtn").onclick=()=>{state.view="Dashboard";render();loadState()};$("modalBg").onclick=e=>{if(e.target===$("modalBg"))closeModal()};
render();loadState();setInterval(async()=>{try{state.device=await api("/api/state");if(state.view==="Dashboard")render();state.wifiStatus=await api("/api/wifi/status")}catch(e){console.log(e.message)}},2000);
</script>
</body>
</html>
)APPHTML"));
}


void handleAppRoot() {
  if (!isAuthenticated()) {
    sendLoginPage();
    return;
  }
  sendAppShell();
}

void handleLoginPost() {
  String username = server.arg("username");
  String password = server.arg("password");
  username.trim();
  if (username == adminUser && password == adminPassword) {
    beginSession();
    logEvent("AUTH", "Admin logged in");
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
    return;
  }
  logEvent("AUTH", "Invalid admin login attempt");
  sendLoginPage("Invalid username or password.");
}

void handleLogout() {
  clearSession();
  server.sendHeader("Set-Cookie", String(SESSION_COOKIE_NAME) + "=; Path=/; Max-Age=0; SameSite=Lax");
  server.sendHeader("Location", "/", true);
  server.send(302, "text/plain", "");
}

void handleApiState() {
  if (!requireApiAdmin()) {
    return;
  }

  DateTime now = currentDateTime();
  String payload;
  payload.reserve(1800);
  payload += F("{\"ok\":true");
  payload += F(",\"deviceId\":\""); payload += jsonEscape(deviceId); payload += F("\"");
  payload += F(",\"apiUrl\":\""); payload += jsonEscape(apiUrl); payload += F("\"");
  payload += F(",\"apiHost\":\""); payload += jsonEscape(apiHost); payload += F("\"");
  payload += F(",\"defaultApiHost\":\""); payload += jsonEscape(defaultApiHost); payload += F("\"");
  payload += F(",\"apIp\":\""); payload += WiFi.softAPIP().toString(); payload += F("\"");
  payload += F(",\"staIp\":\""); payload += wifiReady ? WiFi.localIP().toString() : ""; payload += F("\"");
  payload += F(",\"ssid\":\""); payload += jsonEscape(wifiSsid); payload += F("\"");
  payload += F(",\"time\":\""); payload += jsonEscape(formatTime12(now)); payload += F("\"");
  payload += F(",\"date\":\""); payload += jsonEscape(formatDate(now)); payload += F("\"");
  payload += F(",\"mode\":\""); payload += String((int) mode); payload += F("\"");
  payload += F(",\"wifiReady\":"); payload += wifiReady ? F("true") : F("false");
  payload += F(",\"databaseReady\":"); payload += databaseReady ? F("true") : F("false");
  payload += F(",\"sdReady\":"); payload += sdReady ? F("true") : F("false");
  payload += F(",\"rtcReady\":"); payload += rtcReady ? F("true") : F("false");
  payload += F(",\"nfcReady\":"); payload += nfcReady ? F("true") : F("false");
  payload += F(",\"fingerprintReady\":"); payload += fingerprintReady ? F("true") : F("false");
  payload += F(",\"tftReady\":"); payload += tftReady ? F("true") : F("false");
  payload += F(",\"pendingQueue\":"); payload += String(pendingQueueCount());
  payload += F(",\"rules\":{\"inTime\":\""); payload += minutesToTimeInput(studentInMinutes);
  payload += F("\",\"outDelay\":"); payload += String(outDelayMinutes); payload += F("}");
  payload += F(",\"ui\":{\"seq\":"); payload += String(uiState.seq);
  payload += F(",\"type\":\""); payload += jsonEscape(uiState.type);
  payload += F("\",\"title\":\""); payload += jsonEscape(uiState.title);
  payload += F("\",\"line1\":\""); payload += jsonEscape(uiState.line1);
  payload += F("\",\"line2\":\""); payload += jsonEscape(uiState.line2);
  payload += F("\",\"line3\":\""); payload += jsonEscape(uiState.line3);
  payload += F("\",\"updatedAt\":"); payload += String(uiState.updatedAt);
  payload += F(",\"rtcYear\":"); payload += String(now.year());
  payload += F(",\"rtcMonth\":"); payload += String(now.month());
  payload += F(",\"rtcDay\":"); payload += String(now.day());
  payload += F(",\"rtcHour24\":"); payload += String(now.hour());
  payload += F(",\"rtcMinute\":"); payload += String(now.minute());
  payload += F(",\"rtcSecond\":"); payload += String(now.second());
  payload += F("}}");
  sendJson(200, payload);
}

void handleApiStudents() {
  if (!requireApiAdmin()) {
    return;
  }
  if (!wifiReady || !checkApiStatus()) {
    sendJson(503, "{\"ok\":false,\"error\":\"Registration unavailable. Please connect to WiFi.\"}");
    return;
  }

  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  if (!getDeviceJson("users", response, httpCode, error)) {
    sendJson(503, String("{\"ok\":false,\"error\":\"") + jsonEscape(error.length() ? error : "Registration unavailable. Please connect to WiFi.") + "\"}");
    return;
  }

  String payload;
  payload.reserve(12000);
  payload += F("{\"ok\":true,\"students\":[");
  bool first = true;
  for (JsonObject user : response["users"].as<JsonArray>()) {
    String role = String((const char *) (user["role"] | ""));
    String status = String((const char *) (user["status"] | ""));
    role.toLowerCase();
    status.toLowerCase();
    if (role != "student" || status != "active") {
      continue;
    }
    if (!first) {
      payload += ",";
    }
    first = false;
    payload += F("{\"id\":"); payload += String((int) user["id"]);
    payload += F(",\"idNumber\":\""); payload += jsonEscape(String((const char *) (user["idNumber"] | "")));
    payload += F("\",\"fullName\":\""); payload += jsonEscape(String((const char *) (user["fullName"] | "")));
    payload += F("\",\"department\":\""); payload += jsonEscape(String((const char *) (user["department"] | "")));
    payload += F("\",\"fingerprintId\":\""); payload += jsonEscape(String((const char *) (user["fingerprintId"] | "")));
    payload += F("\",\"smartCardId\":\""); payload += jsonEscape(String((const char *) (user["smartCardId"] | "")));
    payload += F("\"}");
  }
  payload += F("]}");
  sendJson(200, payload);
}

void handleApiRegisterStart() {
  if (!requireApiAdmin()) {
    return;
  }
  if (mode == MODE_REGISTER_FINGERPRINT || mode == MODE_REGISTER_RFID) {
    sendJson(409, "{\"ok\":false,\"error\":\"Registration is already running.\"}");
    return;
  }
  if (!wifiReady || !checkApiStatus()) {
    sendJson(503, "{\"ok\":false,\"error\":\"Registration unavailable. Please connect to WiFi.\"}");
    return;
  }
  if (!sdReady) {
    sendJson(503, "{\"ok\":false,\"error\":\"SD card storage is required for local registration.\"}");
    return;
  }

  DynamicJsonDocument request(512);
  DeserializationError parseError = deserializeJson(request, server.arg("plain"));
  if (parseError) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON payload.\"}");
    return;
  }
  int userId = request["userId"] | 0;
  if (userId <= 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"Please select a valid student.\"}");
    return;
  }

  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  if (!getDeviceJson("users", response, httpCode, error)) {
    sendJson(503, String("{\"ok\":false,\"error\":\"") + jsonEscape(error) + "\"}");
    return;
  }

  bool found = false;
  for (JsonObject user : response["users"].as<JsonArray>()) {
    if ((int) user["id"] != userId) {
      continue;
    }
    String role = String((const char *) (user["role"] | ""));
    String status = String((const char *) (user["status"] | ""));
    role.toLowerCase();
    status.toLowerCase();
    if (role != "student" || status != "active") {
      sendJson(409, "{\"ok\":false,\"error\":\"Selected student is not active.\"}");
      return;
    }
    pendingRegistrationUserId = userId;
    pendingRegistrationIdNumber = String((const char *) (user["idNumber"] | ""));
    pendingRegistrationName = String((const char *) (user["fullName"] | ""));
    found = true;
    break;
  }
  if (!found) {
    sendJson(404, "{\"ok\":false,\"error\":\"Selected student was not found.\"}");
    return;
  }

  pendingFingerprintTemplateId = fingerprintTemplateForUser(pendingRegistrationUserId);
  pendingRfidUid = "";
  registrationPhase = "fingerprint";
  registrationError = "";
  registrationCancelRequested = false;
  mode = MODE_REGISTER_FINGERPRINT;
  drawScreen("Registration", "Selected Student", pendingRegistrationName, "Scan fingerprint", ILI9341_BLUE);
  logEvent("REG", "Started registration for " + pendingRegistrationIdNumber + " " + pendingRegistrationName);
  sendJson(200, "{\"ok\":true,\"message\":\"Registration started.\"}");
}

void handleApiRegisterStatus() {
  if (!requireApiAdmin()) {
    return;
  }
  String payload;
  payload.reserve(900);
  payload += F("{\"ok\":true,\"running\":");
  payload += (mode == MODE_REGISTER_FINGERPRINT || mode == MODE_REGISTER_RFID) ? F("true") : F("false");
  payload += F(",\"phase\":\""); payload += jsonEscape(registrationPhase);
  payload += F("\",\"error\":\""); payload += jsonEscape(registrationError);
  payload += F("\",\"userId\":"); payload += String(pendingRegistrationUserId);
  payload += F(",\"idNumber\":\""); payload += jsonEscape(pendingRegistrationIdNumber);
  payload += F("\",\"fullName\":\""); payload += jsonEscape(pendingRegistrationName);
  payload += F("\",\"fingerprintId\":\""); payload += String(pendingFingerprintTemplateId);
  payload += F("\",\"rfidUid\":\""); payload += jsonEscape(pendingRfidUid);
  payload += F("\"}");
  sendJson(200, payload);
}

void handleApiRegisterCancel() {
  if (!requireApiAdmin()) {
    return;
  }
  registrationCancelRequested = true;
  if (mode == MODE_REGISTER_FINGERPRINT || mode == MODE_REGISTER_RFID) {
    drawScreen("Registration", "Cancel Requested", "Finish current scan", "", ILI9341_YELLOW);
  }
  sendJson(200, "{\"ok\":true}");
}

void handleApiAttendance() {
  if (!requireApiAdmin()) {
    return;
  }
  String payload;
  payload.reserve(10000);
  payload += F("{\"ok\":true,\"records\":[");
  bool first = true;
  if (sdFileExists(ATTENDANCE_FILE)) {
    File file = openSdFile(ATTENDANCE_FILE, FILE_READ);
    String rows[80];
    int count = 0;
    while (file && file.available()) {
      String line = file.readStringUntil('\n');
      line.trim();
      if (line.length() == 0 || line.startsWith("Date,")) {
        continue;
      }
      if (count < 80) {
        rows[count++] = line;
      } else {
        for (int i = 1; i < 80; i++) {
          rows[i - 1] = rows[i];
        }
        rows[79] = line;
      }
      serviceWeb();
    }
    closeSdFile(file);
    for (int i = count - 1; i >= 0; i--) {
      if (!first) {
        payload += ",";
      }
      first = false;
      payload += F("{\"date\":\""); payload += jsonEscape(fieldAt(rows[i], ',', 0));
      payload += F("\",\"time\":\""); payload += jsonEscape(fieldAt(rows[i], ',', 1));
      payload += F("\",\"id\":\""); payload += jsonEscape(fieldAt(rows[i], ',', 2));
      payload += F("\",\"name\":\""); payload += jsonEscape(fieldAt(rows[i], ',', 3));
      payload += F("\",\"status\":\""); payload += jsonEscape(fieldAt(rows[i], ',', 4));
      payload += F("\"}");
    }
  }
  payload += F("]}");
  sendJson(200, payload);
}

void handleApiUsers() {
  if (!requireApiAdmin()) {
    return;
  }
  String payload;
  payload.reserve(10000);
  payload += F("{\"ok\":true,\"users\":[");
  bool first = true;
  if (sdFileExists(USER_CACHE_FILE)) {
    File cache = openSdFile(USER_CACHE_FILE, FILE_READ);
    while (cache && cache.available()) {
      String line = cache.readStringUntil('\n');
      line.trim();
      if (line.length() == 0) {
        continue;
      }
      if (!first) {
        payload += ",";
      }
      first = false;
      payload += F("{\"userId\":\""); payload += jsonEscape(fieldAt(line, '|', 0));
      payload += F("\",\"idNumber\":\""); payload += jsonEscape(fieldAt(line, '|', 1));
      payload += F("\",\"fullName\":\""); payload += jsonEscape(fieldAt(line, '|', 2));
      payload += F("\",\"fingerprintId\":\""); payload += jsonEscape(fieldAt(line, '|', 3));
      payload += F("\",\"smartCardId\":\""); payload += jsonEscape(fieldAt(line, '|', 4));
      payload += F("\"}");
      serviceWeb();
    }
    closeSdFile(cache);
  }
  payload += F("]}");
  sendJson(200, payload);
}

void handleApiWifiScan() {
  if (!requireApiAdmin()) {
    return;
  }

  wifiState = WIFI_STATE_SCANNING;

  // Delete previous scan results and start a new async scan
  WiFi.scanDelete();
  WiFi.scanNetworks(true);

  // Wait for completion while servicing web clients so the UI stays responsive
  int networks = WiFi.scanComplete();
  while (networks == WIFI_SCAN_RUNNING) {
    server.handleClient();
    dnsServer.processNextRequest();
    delay(100);
    networks = WiFi.scanComplete();
  }

  if (networks == WIFI_SCAN_FAILED) {
    WiFi.scanDelete();
    sendJson(200, "{\"ok\":true,\"networks\":[]}");
    return;
  }

  // Filter: 2.4GHz only (channels 1-14), non-empty SSID, no duplicates
  String seen[64];
  int seenCount = 0;

  String payload;
  payload.reserve(2048);
  payload += F("{\"ok\":true,\"networks\":[");

  bool first = true;
  for (int i = 0; i < networks; i++) {
    String ssid = WiFi.SSID(i);
    ssid.trim();

    // Skip empty SSIDs
    if (ssid.length() == 0) {
      continue;
    }

    // Skip non-2.4GHz networks (channel >= 36 is 5GHz)
    int8_t ch = WiFi.channel(i);
    if (ch < 1 || ch > 14) {
      continue;
    }

    // Skip duplicates (case-insensitive)
    bool duplicate = false;
    String lowerSsid = ssid;
    lowerSsid.toLowerCase();
    for (int j = 0; j < seenCount; j++) {
      if (seen[j] == lowerSsid) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) {
      continue;
    }

    // Store seen SSID (lowercase for case-insensitive dedup)
    if (seenCount < 64) {
      seen[seenCount++] = lowerSsid;
    }

    if (!first) {
      payload += ",";
    }
    first = false;

    payload += F("{\"ssid\":\""); payload += jsonEscape(ssid);
    payload += F("\",\"rssi\":"); payload += String(WiFi.RSSI(i));
    payload += F(",\"open\":"); payload += WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? F("true") : F("false");
    payload += F("}");
  }

  payload += F("]}");
  WiFi.scanDelete();
  sendJson(200, payload);
}

void handleApiWifiSave() {
  if (!requireApiAdmin()) {
    return;
  }
  DynamicJsonDocument request(512);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON payload.\"}");
    return;
  }
  String ssid = String((const char *) (request["ssid"] | ""));
  String password = String((const char *) (request["password"] | ""));
  ssid.trim();
  if (ssid.length() == 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"WiFi SSID is required.\"}");
    return;
  }
  wifiSsid = ssid;
  wifiPassword = password;
  prefs.putString("ssid", wifiSsid);
  prefs.putString("pass", wifiPassword);
  drawScreen("WiFi", "Connecting...", wifiSsid, "AP stays online", ILI9341_BLUE);
  wifiReady = connectToWifi(wifiSsid, wifiPassword, WIFI_CONNECT_TIMEOUT_MS);
  if (wifiReady) {
    syncClock();
    checkApiStatus();
    fetchAndCacheUsers();
    drawScreen("WiFi Connected", "Station IP", WiFi.localIP().toString(), "AP: 192.168.4.1", ILI9341_GREEN);
    logEvent("WIFI", "Connected to " + wifiSsid + " at " + WiFi.localIP().toString());
    sendJson(200, "{\"ok\":true,\"connected\":true}");
    return;
  }
  drawScreen("WiFi", "Connection Failed", "AP: 192.168.4.1", "Check password", ILI9341_RED);
  logEvent("WIFI", "Connection failed for " + wifiSsid);
  sendJson(200, "{\"ok\":true,\"connected\":false}");
}

void handleApiWifiReset() {
  if (!requireApiAdmin()) {
    return;
  }

  // Clear saved credentials from Preferences
  prefs.remove("ssid");
  prefs.remove("pass");

  // Clear global variables so maintainWifi() won't try to reconnect
  wifiSsid = "";
  wifiPassword = "";

  // Disconnect WiFi and disable auto-reconnect
  WiFi.disconnect();
  WiFi.setAutoReconnect(false);
  delay(100);

  // Ensure AP + STA mode stays active (STA stays disconnected)
  WiFi.mode(WIFI_AP_STA);

  // Update status flags
  wifiReady = false;
  databaseReady = false;
  wifiState = WIFI_STATE_DISCONNECTED;

  // Prevent maintainWifi() from scheduling reconnect attempts for 1 hour
  lastWifiReconnectAt = millis() + 3600000;

  logEvent("WIFI", "WiFi credentials cleared by user via browser. Device is in AP mode.");
  drawScreen("WiFi Reset", "Credentials Cleared", "AP: 192.168.4.1", "Re-scan available", ILI9341_YELLOW);

  sendJson(200, "{\"ok\":true,\"message\":\"WiFi credentials cleared. Device is in AP mode. You can now scan for available networks.\"}");
}

void handleApiSettingsApi() {
  if (!requireApiAdmin()) {
    return;
  }

  if (server.method() == HTTP_POST) {
    DynamicJsonDocument request(256);
    if (deserializeJson(request, server.arg("plain"))) {
      sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON.\"}");
      return;
    }

    String action = String((const char *)(request["action"] | ""));

    if (action == "save") {
      apiHost = String((const char *)(request["host"] | apiHost.c_str()));
      apiHost.trim();
      if (apiHost.length() == 0) {
        sendJson(400, "{\"ok\":false,\"error\":\"Host cannot be empty.\"}");
        return;
      }
      apiUrl = String("http://") + apiHost + "/fingerprint/api/device.php";
      prefs.putString("apiHost", apiHost);
      prefs.putString("apiUrl", apiUrl);
      logEvent("API", "API host set to " + apiHost);
      sendJson(200, "{\"ok\":true}");
    } else if (action == "default") {
      saveDefaultHost();
      logEvent("API", "Default API host set to " + defaultApiHost);
      sendJson(200, "{\"ok\":true}");
    } else if (action == "reset") {
      apiHost = defaultApiHost;
      apiUrl = String("http://") + apiHost + "/fingerprint/api/device.php";
      prefs.putString("apiHost", apiHost);
      prefs.putString("apiUrl", apiUrl);
      logEvent("API", "API host reset to default " + defaultApiHost);
      sendJson(200, "{\"ok\":true}");
    } else {
      sendJson(400, "{\"ok\":false,\"error\":\"Unknown action.\"}");
    }
    return;
  }

  // GET - return current API settings
  String payload;
  payload.reserve(512);
  payload += F("{\"ok\":true");
  payload += F(",\"host\":\""); payload += jsonEscape(apiHost); payload += F("\"");
  payload += F(",\"defaultHost\":\""); payload += jsonEscape(defaultApiHost); payload += F("\"");
  payload += F(",\"currentUrl\":\"http://"); payload += jsonEscape(apiHost); payload += F("/fingerprint/api/device.php\"");
  payload += F(",\"defaultUrl\":\"http://"); payload += jsonEscape(defaultApiHost); payload += F("/fingerprint/api/device.php\"");
  payload += F("}");
  sendJson(200, payload);
}

void handleApiWifiStatus() {
  if (!requireApiAdmin()) {
    return;
  }

  String stateStr;
  switch (wifiState) {
    case WIFI_STATE_DISCONNECTED:      stateStr = "Disconnected"; break;
    case WIFI_STATE_SCANNING:          stateStr = "Scanning"; break;
    case WIFI_STATE_CONNECTING:        stateStr = "Connecting"; break;
    case WIFI_STATE_AUTHENTICATING:    stateStr = "Authenticating"; break;
    case WIFI_STATE_CONNECTED:         stateStr = "Connected"; break;
    case WIFI_STATE_CONNECTION_FAILED: stateStr = "Connection Failed"; break;
    case WIFI_STATE_RECONNECTING:      stateStr = "Reconnecting"; break;
  }

  String payload;
  payload.reserve(512);
  payload += F("{\"ok\":true,\"ssid\":\"");
  payload += jsonEscape(wifiReady ? WiFi.SSID() : wifiSsid);
  payload += F("\",\"status\":\"");
  payload += stateStr;
  payload += F("\",\"ip\":\"");
  payload += wifiReady ? WiFi.localIP().toString() : "";
  payload += F("\",\"rssi\":");
  payload += wifiReady ? String(WiFi.RSSI()) : String("0");
  payload += F("}");
  sendJson(200, payload);
}

void handleApiRules() {
  if (!requireApiAdmin()) {
    return;
  }
  if (server.method() == HTTP_GET) {
    String payload = String("{\"ok\":true,\"inTime\":\"") + minutesToTimeInput(studentInMinutes) + "\",\"outDelay\":" + String(outDelayMinutes) + "}";
    sendJson(200, payload);
    return;
  }

  DynamicJsonDocument request(512);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON payload.\"}");
    return;
  }
  studentInMinutes = timeInputToMinutes(String((const char *) (request["inTime"] | "10:00")), DEFAULT_STUDENT_IN_MINUTES);
  uint16_t requestedDelay = request["outDelay"] | DEFAULT_OUT_DELAY_MINUTES;
  if (requestedDelay == 1 || requestedDelay == 5 || requestedDelay == 10 || requestedDelay == 15 || requestedDelay == 30 || requestedDelay == 60) {
    outDelayMinutes = requestedDelay;
  } else {
    outDelayMinutes = DEFAULT_OUT_DELAY_MINUTES;
  }
  saveRules();
  logEvent("RULES", "Updated IN " + minutesToTimeInput(studentInMinutes) + " OUT delay " + String(outDelayMinutes) + " minutes");
  sendJson(200, "{\"ok\":true}");
}

void handleApiLogs() {
  if (!requireApiAdmin()) {
    return;
  }
  String events;
  String unsent;
  if (sdFileExists(DEVICE_LOG_FILE)) {
    File file = openSdFile(DEVICE_LOG_FILE, FILE_READ);
    uint16_t shown = 0;
    while (file && file.available() && shown < SD_FILE_PREVIEW_BYTES) {
      events += (char) file.read();
      shown++;
      serviceWeb();
    }
    closeSdFile(file);
  }
  if (sdFileExists(UNSENT_FILE)) {
    File file = openSdFile(UNSENT_FILE, FILE_READ);
    uint16_t shown = 0;
    while (file && file.available() && shown < SD_FILE_PREVIEW_BYTES) {
      unsent += (char) file.read();
      shown++;
      serviceWeb();
    }
    closeSdFile(file);
  }
  sendJson(200, String("{\"ok\":true,\"events\":\"") + jsonEscape(events) + "\",\"unsent\":\"" + jsonEscape(unsent) + "\"}");
}

void handleApiBackupSettings() {
  if (!requireApiAdmin()) {
    return;
  }
  String payload;
  payload.reserve(1600);
  payload += F("{\"ok\":true,\"deviceId\":\""); payload += jsonEscape(deviceId);
  payload += F("\",\"apiUrl\":\""); payload += jsonEscape(apiUrl);
  payload += F("\",\"apiHost\":\""); payload += jsonEscape(apiHost);
  payload += F("\",\"defaultApiHost\":\""); payload += jsonEscape(defaultApiHost);
  payload += F("\",\"apiKey\":\""); payload += jsonEscape(apiKey);
  payload += F("\",\"adminUser\":\""); payload += jsonEscape(adminUser);
  payload += F("\",\"adminPassword\":\""); payload += jsonEscape(adminPassword);
  payload += F("\",\"wifiSsid\":\""); payload += jsonEscape(wifiSsid);
  payload += F("\",\"wifiPassword\":\""); payload += jsonEscape(wifiPassword);
  payload += F("\",\"rules\":{\"inTime\":\""); payload += minutesToTimeInput(studentInMinutes);
  payload += F("\",\"outDelay\":"); payload += String(outDelayMinutes);
  payload += F("},\"note\":\"Fingerprint templates are stored in the fingerprint sensor and are not part of this backup.\"}");
  server.sendHeader("Content-Disposition", "attachment; filename=francis-key-settings.json");
  sendJson(200, payload);
}

void handleApiBackupFile() {
  if (!requireApiAdmin()) {
    return;
  }
  String path = backupFilePathForName(server.arg("name"));
  if (path.length() == 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"Unknown backup file.\"}");
    return;
  }
  if (!sdReady || !sdFileExists(path.c_str())) {
    sendJson(404, "{\"ok\":false,\"error\":\"File is not available on SD.\"}");
    return;
  }
  File file = openSdFile(path.c_str(), FILE_READ);
  if (!file) {
    sendJson(500, "{\"ok\":false,\"error\":\"Cannot open SD file.\"}");
    return;
  }
  String filename = path.substring(1);
  server.sendHeader("Content-Disposition", "attachment; filename=" + filename);
  server.streamFile(file, "text/plain");
  closeSdFile(file);
}

void handleApiRestoreSettings() {
  if (!requireApiAdmin()) {
    return;
  }
  DynamicJsonDocument request(4096);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid settings JSON.\"}");
    return;
  }
  apiHost = String((const char *) (request["apiHost"] | apiHost.c_str()));
  defaultApiHost = String((const char *) (request["defaultApiHost"] | defaultApiHost.c_str()));
  apiUrl = String((const char *) (request["apiUrl"] | apiUrl.c_str()));
  apiKey = String((const char *) (request["apiKey"] | apiKey.c_str()));
  deviceId = String((const char *) (request["deviceId"] | deviceId.c_str()));
  adminUser = String((const char *) (request["adminUser"] | adminUser.c_str()));
  adminPassword = String((const char *) (request["adminPassword"] | adminPassword.c_str()));
  wifiSsid = String((const char *) (request["wifiSsid"] | wifiSsid.c_str()));
  wifiPassword = String((const char *) (request["wifiPassword"] | wifiPassword.c_str()));
  if (request["rules"].is<JsonObject>()) {
    JsonObject rules = request["rules"];
    studentInMinutes = timeInputToMinutes(String((const char *) (rules["inTime"] | minutesToTimeInput(studentInMinutes).c_str())), studentInMinutes);
    uint16_t restoredDelay = rules["outDelay"] | outDelayMinutes;
    if (restoredDelay == 1 || restoredDelay == 5 || restoredDelay == 10 || restoredDelay == 15 || restoredDelay == 30 || restoredDelay == 60) {
      outDelayMinutes = restoredDelay;
    }
  }
  saveSettings();
  saveRules();
  prefs.putString("ssid", wifiSsid);
  prefs.putString("pass", wifiPassword);
  logEvent("RESTORE", "Settings restored from browser");
  sendJson(200, "{\"ok\":true}");
}

void handleApiRestoreFile() {
  if (!requireApiAdmin()) {
    return;
  }
  String path = backupFilePathForName(server.arg("name"));
  if (path.length() == 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"Unknown restore file.\"}");
    return;
  }
  if (!sdReady) {
    sendJson(503, "{\"ok\":false,\"error\":\"SD card is not ready.\"}");
    return;
  }
  removeSdFile(path.c_str());
  File file = openSdFile(path.c_str(), FILE_WRITE);
  if (!file) {
    sendJson(500, "{\"ok\":false,\"error\":\"Cannot write SD file.\"}");
    return;
  }
  file.print(server.arg("plain"));
  closeSdFile(file);
  if (path == UNSENT_FILE) {
    _pendingQueueCacheValid = false;
  }
  logEvent("RESTORE", "Restored " + path + " from browser");
  sendJson(200, "{\"ok\":true}");
}

void handleApiSdFile() {
  if (!requireApiAdmin()) {
    return;
  }
  String path = normalizeSdPath(server.arg("path"));
  if (path.length() == 0 || !sdReady || !sdFileExists(path.c_str())) {
    sendJson(404, "{\"ok\":false,\"error\":\"SD file not found.\"}");
    return;
  }
  File file = openSdFile(path.c_str(), FILE_READ);
  if (!file || file.isDirectory()) {
    closeSdFile(file);
    sendJson(400, "{\"ok\":false,\"error\":\"Path is not a readable file.\"}");
    return;
  }
  server.streamFile(file, "text/plain");
  closeSdFile(file);
}

void handleApiTimeSet() {
  if (!requireApiAdmin()) {
    return;
  }

  DynamicJsonDocument request(256);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON.\"}");
    return;
  }

  int year = request["year"] | 0;
  int month = request["month"] | 0;
  int day = request["day"] | 0;
  int hour12 = request["hour12"] | 0;
  int minute = request["minute"] | 0;
  bool isPm = request["isPm"] | false;

  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31 ||
      hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid date or time values.\"}");
    return;
  }

  int hour24 = hour12 % 12;
  if (isPm) {
    hour24 += 12;
  }

  if (rtcReady) {
    rtc.adjust(DateTime(year, month, day, hour24, minute, 0));
    logEvent("TIME", "RTC manually set to " + formatDate(DateTime(year, month, day, hour24, minute, 0)) + " " + formatTime12(DateTime(year, month, day, hour24, minute, 0)));
    sendJson(200, "{\"ok\":true,\"message\":\"Date and time updated.\"}");
  } else {
    sendJson(503, "{\"ok\":false,\"error\":\"RTC is not available.\"}");
  }
}

void handlePortalRoot() {
  int networks = WiFi.scanNetworks();
  String options;

  for (int i = 0; i < networks; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) {
      continue;
    }

    options += "<option value='";
    options += htmlEscape(ssid);
    options += "'>";
    options += htmlEscape(ssid);
    options += " (";
    options += String(WiFi.RSSI(i));
    options += " dBm, ";
    options += WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured";
    options += ")</option>";
  }

  String body;
  body += F("<div class='card'><h2>Select a WiFi to connect this device</h2>");
  body += F("<p>ESP32 scans 2.4GHz networks only.</p>");
  body += F("<form method='post' action='/connect'><label>WiFi Network</label><select name='ssid'>");
  body += options;
  body += F("</select><label>Password</label><input name='password' type='password' autocomplete='current-password'>");
  body += F("<button type='submit'>Connect</button></form></div>");
  server.send(200, "text/html", htmlPage("Install Francis Key Device", body));
}

void handlePortalConnect() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");

  drawScreen("WiFi Setup", "Connecting...", "Please wait...", ssid, ILI9341_BLUE);
  server.send(200, "text/html", htmlPage("Connecting", "<div class='card'><h2>Connecting...</h2><p>Please wait. The device will restart when successful.</p></div>"));

  if (connectToWifi(ssid, password, WIFI_CONNECT_TIMEOUT_MS)) {
    prefs.putString("ssid", ssid);
    prefs.putString("pass", password);
    drawScreen("WiFi Setup", "Connected", "Restarting", "", ILI9341_GREEN);
    signalSuccess();
    delay(1200);
    ESP.restart();
  }

  drawScreen("WiFi Setup", "Connection Failed", "Please Try Again", "", ILI9341_RED);
  signalError();
}

void handleStatusPage() {
  if (!requireAdmin()) {
    return;
  }

  checkApiStatus();
  DateTime now = currentDateTime();
  String body;
  body += F("<div class='card'><h2>Device Status</h2><table>");
  body += F("<tr><th>Device ID</th><td>");
  body += htmlEscape(deviceId);
  body += F("</td></tr><tr><th>IP Address</th><td>");
  body += htmlEscape(WiFi.localIP().toString());
  body += F("</td></tr><tr><th>Current Time</th><td>");
  body += htmlEscape(formatDate(now) + " " + formatTime12(now));
  body += F("</td></tr><tr><th>WiFi</th><td class='");
  body += wifiReady ? "ok" : "bad";
  body += F("'>");
  body += wifiReady ? "Connected" : "Offline";
  body += F("</td></tr><tr><th>Database API</th><td class='");
  body += databaseReady ? "ok" : "bad";
  body += F("'>");
  body += databaseReady ? "Connected" : "Offline";
  body += F("</td></tr><tr><th>SD Card</th><td class='");
  body += sdReady ? "ok" : "bad";
  body += F("'>");
  body += sdReady ? "Ready" : "Missing";
  body += F("</td></tr><tr><th>Fingerprint</th><td class='");
  body += fingerprintReady ? "ok" : "bad";
  body += F("'>");
  body += fingerprintReady ? "Ready" : "Missing";
  body += F("</td></tr><tr><th>PN532</th><td class='");
  body += nfcReady ? "ok" : "bad";
  body += F("'>");
  body += nfcReady ? "Ready" : "Missing";
  body += F("</td></tr>");
  body += F("</table></div>");
  body += F("<div class='card'><a href='/register'>Register User</a> | <a href='/attendance'>Attendance</a> | <a href='/logs'>Logs</a> | <a href='/settings'>Settings</a></div>");
  server.send(200, "text/html", htmlPage("Francis Key Device", body));
}

void handleRegisterPage() {
  if (!requireAdmin()) {
    return;
  }

  String body;
  body += F("<div class='card'><h2>Select Existing User</h2>");
  body += F("<form method='post' action='/register'><select name='userId'>");
  body += buildUserOptions();
  body += F("</select><input name='userName' placeholder='Selected user display name'><button type='submit'>Register User</button></form>");
  body += F("<p>The TFT will request 3 fingerprint scans, then 2 RFID scans.</p></div>");
  server.send(200, "text/html", htmlPage("Register Fingerprint and RFID", body));
}

void handleRegisterPost() {
  if (!requireAdmin()) {
    return;
  }

  pendingRegistrationUserId = server.arg("userId").toInt();
  pendingRegistrationName = server.arg("userName");
  if (pendingRegistrationUserId <= 0) {
    server.send(400, "text/html", htmlPage("Registration Error", "<div class='card bad'>Please select a valid user.</div>"));
    return;
  }
  if (!sdReady) {
    server.send(503, "text/html", htmlPage("Registration Error", "<div class='card bad'>SD card storage is required for local registration.</div>"));
    return;
  }

  pendingFingerprintTemplateId = fingerprintTemplateForUser(pendingRegistrationUserId);
  mode = MODE_REGISTER_FINGERPRINT;
  server.send(200, "text/html", htmlPage("Registration Started", "<div class='card'><h2>Registration started.</h2><p>Follow the instructions on the LCD display.</p></div>"));
}

void handleAttendancePage() {
  if (!requireAdmin()) {
    return;
  }

  String body;
  body += F("<div class='card'><h2>Recent Local Attendance</h2><table><tr><th>Date</th><th>Time</th><th>ID</th><th>Name</th><th>Status</th></tr>");

  if (sdFileExists(ATTENDANCE_FILE)) {
    File file = openSdFile(ATTENDANCE_FILE, FILE_READ);
    int rowCount = 0;
    while (file && file.available() && rowCount < 80) {
      String line = file.readStringUntil('\n');
      line.trim();
      if (line.length() == 0 || line.startsWith("Date,")) {
        continue;
      }
      body += F("<tr><td>");
      body += htmlEscape(fieldAt(line, ',', 0));
      body += F("</td><td>");
      body += htmlEscape(fieldAt(line, ',', 1));
      body += F("</td><td>");
      body += htmlEscape(fieldAt(line, ',', 2));
      body += F("</td><td>");
      body += htmlEscape(fieldAt(line, ',', 3));
      body += F("</td><td>");
      body += htmlEscape(fieldAt(line, ',', 4));
      body += F("</td></tr>");
      rowCount++;
    }
    closeSdFile(file);
  }

  body += F("</table></div><div class='card'><a href='/'>Back to status</a></div>");
  server.send(200, "text/html", htmlPage("Attendance Logs", body));
}

void handleLogsPage() {
  if (!requireAdmin()) {
    return;
  }

  String body;
  body += F("<div class='card'><h2>Offline Sync Queue</h2><pre>");
  if (sdFileExists(UNSENT_FILE)) {
    File file = openSdFile(UNSENT_FILE, FILE_READ);
    while (file && file.available()) {
      body += htmlEscape(file.readStringUntil('\n'));
      body += "\n";
    }
    closeSdFile(file);
  } else {
    body += "No pending records.";
  }
  body += F("</pre></div><div class='card'><a href='/'>Back to status</a></div>");
  server.send(200, "text/html", htmlPage("Device Logs", body));
}

void handleSettingsPage() {
  if (!requireAdmin()) {
    return;
  }

  String body;
  body += F("<div class='card'><form method='post' action='/settings'>");
  body += F("<label>Project API URL</label><input name='apiUrl' value='");
  body += htmlEscape(apiUrl);
  body += F("'><label>Device API Key</label><input name='apiKey' value='");
  body += htmlEscape(apiKey);
  body += F("'><label>Device ID</label><input name='deviceId' value='");
  body += htmlEscape(deviceId);
  body += F("'><label>Admin User</label><input name='adminUser' value='");
  body += htmlEscape(adminUser);
  body += F("'><label>Admin Password</label><input name='adminPassword' type='password' value='");
  body += htmlEscape(adminPassword);
  body += F("'>");
  body += F("<button type='submit'>Save Settings</button></form></div>");
  body += F("<div class='card'><h2>SD Card Storage</h2><p>Status: <span class='");
  body += sdReady ? "ok" : "bad";
  body += F("'>");
  body += sdReady ? "Ready" : "Missing";
  body += F("</span></p><a href='/sd?path=/'>View SD card files</a></div>");
  body += F("<div class='card'><form method='post' action='/reset-wifi'><button class='danger' type='submit'>Reset WiFi Setup</button></form></div>");
  server.send(200, "text/html", htmlPage("Device Settings", body));
}

void handleSettingsPost() {
  if (!requireAdmin()) {
    return;
  }

  apiUrl = server.arg("apiUrl");
  apiKey = server.arg("apiKey");
  deviceId = server.arg("deviceId");
  adminUser = server.arg("adminUser");
  adminPassword = server.arg("adminPassword");
  saveSettings();
  checkApiStatus();

  server.send(200, "text/html", htmlPage("Settings Saved", "<div class='card'><h2>Settings saved.</h2><a href='/'>Back to status</a></div>"));
}

void handleWifiResetPost() {
  if (!requireAdmin()) {
    return;
  }

  prefs.remove("ssid");
  prefs.remove("pass");
  server.send(200, "text/html", htmlPage("WiFi Reset", "<div class='card'><h2>WiFi settings cleared.</h2><p>The device will restart into installation mode.</p></div>"));
  delay(1000);
  ESP.restart();
}

void handleSdBrowserPage() {
  if (!requireAdmin()) {
    return;
  }

  if (!sdReady) {
    server.send(503, "text/html", htmlPage("SD Card Storage", "<div class='card bad'>SD card is missing or not ready.</div><div class='card'><a href='/settings'>Back to settings</a></div>"));
    return;
  }

  String path = normalizeSdPath(server.hasArg("path") ? server.arg("path") : "/");
  if (path.length() == 0) {
    server.send(400, "text/html", htmlPage("SD Card Storage", "<div class='card bad'>Invalid SD path.</div><div class='card'><a href='/sd?path=/'>Open root</a></div>"));
    return;
  }

  File item = openSdFile(path.c_str(), FILE_READ);
  if (!item) {
    server.send(404, "text/html", htmlPage("SD Card Storage", "<div class='card bad'>Path was not found on the SD card.</div><div class='card'><a href='/sd?path=/'>Open root</a></div>"));
    return;
  }

  String body;
  body += F("<div class='card'><a href='/settings'>Settings</a> | <a href='/sd?path=/'>SD root</a>");
  if (path != "/") {
    body += F(" | <a href='/sd?path=");
    body += urlEncode(parentSdPath(path));
    body += F("'>Parent folder</a>");
  }
  body += F("</div>");

  if (item.isDirectory()) {
    body += F("<div class='card'><h2>");
    body += htmlEscape(path);
    body += F("</h2><table><tr><th>Name</th><th>Type</th><th>Size</th></tr>");

    File entry = item.openNextFile();
    while (entry) {
      String name = String(entry.name());
      String entryPath = name.startsWith("/") ? name : sdChildPath(path, name);
      body += F("<tr><td><a href='/sd?path=");
      body += urlEncode(entryPath);
      body += F("'>");
      body += htmlEscape(name);
      body += F("</a></td><td>");
      if (entry.isDirectory()) {
        body += "Folder";
      } else {
        body += "File";
      }
      body += F("</td><td>");
      if (entry.isDirectory()) {
        body += "-";
      } else {
        body += fileSizeLabel(entry.size());
      }
      body += F("</td></tr>");
      entry.close();
      entry = item.openNextFile();
    }

    body += F("</table></div>");
  } else {
    body += F("<div class='card'><h2>");
    body += htmlEscape(path);
    body += F("</h2><p>Size: ");
    body += fileSizeLabel(item.size());
    body += F("</p><pre>");

    uint16_t shown = 0;
    while (item.available() && shown < SD_FILE_PREVIEW_BYTES) {
      char c = (char) item.read();
      if (c == '\r') {
        continue;
      }
      body += htmlEscape(String(c));
      shown++;
    }

    body += F("</pre>");
    if (item.available()) {
      body += F("<p>Preview stopped because the file is larger than the browser limit.</p>");
    }
    body += F("</div>");
  }

  closeSdFile(item);
  server.send(200, "text/html", htmlPage("SD Card Storage", body));
}

String buildUserOptions() {
  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  String options;

  if (!getDeviceJson("users", response, httpCode, error)) {
    options += "<option value=''>Unable to load users: ";
    options += htmlEscape(error);
    options += "</option>";
    return options;
  }

  JsonArray users = response["users"].as<JsonArray>();
  if (sdReady) {
    removeSdFile(USER_CACHE_TEMP_FILE);
    File cache = openSdFile(USER_CACHE_TEMP_FILE, FILE_WRITE);
    bool cacheOpened = (bool) cache;
    for (JsonObject user : users) {
      String userId = String((int) user["id"]);
      String idNumber = String((const char *) (user["idNumber"] | ""));
      String fullName = String((const char *) (user["fullName"] | ""));
      String fingerprintId = String((const char *) (user["fingerprintId"] | ""));
      String smartCardId = String((const char *) (user["smartCardId"] | ""));

      if (cache) {
        LocalUser cached;
        cached.userId = userId;
        cached.idNumber = idNumber;
        cached.fullName = fullName;
        cached.fingerprintId = fingerprintId;
        cached.smartCardId = smartCardId;
        writeCachedUserLine(cache, cached);
      }

      options += F("<option value='");
      options += htmlEscape(userId);
      options += F("'>");
      options += htmlEscape(idNumber + " - " + fullName);
      options += "</option>";
    }
    if (cacheOpened) {
      closeSdFile(cache);
      removeSdFile(USER_CACHE_FILE);
      renameSdFile(USER_CACHE_TEMP_FILE, USER_CACHE_FILE);
    }
  } else {
    for (JsonObject user : users) {
      String userId = String((int) user["id"]);
      String idNumber = String((const char *) (user["idNumber"] | ""));
      String fullName = String((const char *) (user["fullName"] | ""));
      options += F("<option value='");
      options += htmlEscape(userId);
      options += F("'>");
      options += htmlEscape(idNumber + " - " + fullName);
      options += "</option>";
    }
  }

  return options;
}

bool getDeviceJson(const String &action, DynamicJsonDocument &response, int &httpCode, String &error) {
  if (!wifiReady) {
    httpCode = 0;
    error = "WiFi is offline.";
    return false;
  }

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(endpointFor(action));
  http.addHeader("X-Device-Key", apiKey);
  httpCode = http.GET();
  String payload = http.getString();
  http.end();

  if (httpCode <= 0) {
    error = "Cannot reach project API.";
    return false;
  }

  DeserializationError parseError = deserializeJson(response, payload);
  if (parseError) {
    error = "Invalid API JSON response.";
    return false;
  }

  bool ok = httpCode >= 200 && httpCode < 300 && response["ok"].as<bool>();
  if (!ok) {
    error = String((const char *) (response["error"] | "API request failed."));
    return false;
  }

  return true;
}

bool postDeviceJson(const String &action, DynamicJsonDocument &request, DynamicJsonDocument &response, int &httpCode, String &error) {
  if (!wifiReady) {
    httpCode = 0;
    error = "WiFi is offline.";
    return false;
  }

  request["deviceId"] = deviceId;

  String body;
  serializeJson(request, body);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(endpointFor(action));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", apiKey);
  httpCode = http.POST(body);
  String payload = http.getString();
  http.end();

  if (httpCode <= 0) {
    error = "Cannot reach project API.";
    return false;
  }

  DeserializationError parseError = deserializeJson(response, payload);
  if (parseError) {
    error = "Invalid API JSON response.";
    return false;
  }

  bool ok = httpCode >= 200 && httpCode < 300 && response["ok"].as<bool>();
  if (!ok) {
    error = String((const char *) (response["error"] | "API request failed."));
    return false;
  }

  return true;
}

String endpointFor(const String &action) {
  String url = apiUrl;
  url += apiUrl.indexOf('?') >= 0 ? "&action=" : "?action=";
  url += action;
  return url;
}

bool checkApiStatus() {
  DynamicJsonDocument response(2048);
  int httpCode = 0;
  String error;
  databaseReady = getDeviceJson("status", response, httpCode, error);
  return databaseReady;
}

bool fetchAndCacheUsers() {
  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  if (!getDeviceJson("users", response, httpCode, error)) {
    return false;
  }

  if (!sdReady) {
    return true;
  }

  removeSdFile(USER_CACHE_TEMP_FILE);
  File cache = openSdFile(USER_CACHE_TEMP_FILE, FILE_WRITE);
  if (!cache) {
    return false;
  }

  JsonArray users = response["users"].as<JsonArray>();
  for (JsonObject user : users) {
    LocalUser cached;
    cached.userId = String((int) user["id"]);
    cached.idNumber = String((const char *) (user["idNumber"] | ""));
    cached.fullName = String((const char *) (user["fullName"] | ""));
    cached.fingerprintId = String((const char *) (user["fingerprintId"] | ""));
    cached.smartCardId = String((const char *) (user["smartCardId"] | ""));
    writeCachedUserLine(cache, cached);
  }
  closeSdFile(cache);
  removeSdFile(USER_CACHE_FILE);
  return renameSdFile(USER_CACHE_TEMP_FILE, USER_CACHE_FILE);
}

bool registerCredentials(uint16_t fingerprintId, const String &rfidUid, String &error) {
  DynamicJsonDocument request(1024);
  DynamicJsonDocument response(4096);
  int httpCode = 0;

  request["userId"] = pendingRegistrationUserId;
  request["fingerprintId"] = String(fingerprintId);
  request["smartCardId"] = rfidUid;

  bool ok = postDeviceJson("register", request, response, httpCode, error);
  databaseReady = ok || (httpCode > 0 && httpCode < 500);
  if (ok) {
    JsonObject user = response["user"].as<JsonObject>();
    pendingRegistrationName = String((const char *) (user["fullName"] | pendingRegistrationName.c_str()));
    LocalUser cached;
    cached.found = true;
    cached.userId = String((int) (user["id"] | pendingRegistrationUserId));
    cached.idNumber = String((const char *) (user["idNumber"] | ""));
    cached.fullName = pendingRegistrationName;
    cached.fingerprintId = String(fingerprintId);
    cached.smartCardId = rfidUid;
    String localError;
    if (!upsertCachedUser(cached, localError)) {
      error = localError;
      return false;
    }
    fetchAndCacheUsers();
  }
  return ok;
}

bool upsertCachedUser(const LocalUser &updated, String &error) {
  Serial.println(F("[CACHE] upsertCachedUser() called"));
  Serial.printf("[CACHE]   userId=%s  idNumber=%s  fullName=%s  fpId=%s  cardId=%s\n",
                updated.userId.c_str(), updated.idNumber.c_str(),
                updated.fullName.c_str(), updated.fingerprintId.c_str(),
                updated.smartCardId.c_str());

  if (!sdReady) {
    error = "SD card is not ready.";
    Serial.printf("[CACHE] FAIL: %s\n", error.c_str());
    return false;
  }
  Serial.println(F("[CACHE] sdReady check passed"));

  // ====================================================================
  // Phase 1: read the entire existing cache into memory FIRST, then
  // close the input.  This avoids opening two SD files at once, which
  // would corrupt the shared-SPI bus (each openSdFile re-inits SPI).
  // ====================================================================
  const int MAX_LINES = 150;
  String lines[MAX_LINES];
  int lineCount = 0;
  bool hadCache = sdFileExists(USER_CACHE_FILE);

  if (hadCache) {
    Serial.printf("[CACHE] Reading existing %s into memory...\n", USER_CACHE_FILE);
    File input = openSdFile(USER_CACHE_FILE, FILE_READ);
    if (input) {
      while (input.available() && lineCount < MAX_LINES) {
        String line = input.readStringUntil('\n');
        line.trim();
        if (line.length() > 0) {
          lines[lineCount++] = line;
        }
        yield();
      }
      closeSdFile(input);
      Serial.printf("[CACHE] Read %d lines from existing cache\n", lineCount);
    } else {
      Serial.println(F("[CACHE] Could not open existing cache, treating as empty"));
      hadCache = false;
    }
  }

  // ====================================================================
  // Phase 2: remove stale temp file, then open output and write
  // everything in one pass.
  // ====================================================================
  if (sdFileExists(USER_CACHE_TEMP_FILE)) {
    Serial.printf("[CACHE] Removing stale temp %s...\n", USER_CACHE_TEMP_FILE);
    removeSdFile(USER_CACHE_TEMP_FILE);
  }

  Serial.printf("[CACHE] Opening temp file %s for writing...  heap free: %u\n",
                USER_CACHE_TEMP_FILE, ESP.getFreeHeap());

  File output = openSdFile(USER_CACHE_TEMP_FILE, FILE_WRITE);
  if (!output) {
    error = "Cannot write local user cache (SD open failed).";
    Serial.printf("[CACHE] FAIL: %s\n", error.c_str());
    debugSdStatus();
    return false;
  }

  bool wroteUpdated = false;
  const String updatedLine = cachedUserLine(updated);

  for (int i = 0; i < lineCount; i++) {
    if (fieldAt(lines[i], '|', 0) == updated.userId) {
      output.println(updatedLine);
      wroteUpdated = true;
    } else {
      output.println(lines[i]);
    }
    yield();
  }

  if (!wroteUpdated) {
    output.println(updatedLine);
    Serial.printf("[CACHE] Appended new user row (userId=%s)\n", updated.userId.c_str());
  }

  closeSdFile(output);
  Serial.println(F("[CACHE] Temp file closed"));

  // ====================================================================
  // Phase 3: atomically replace old cache with new.
  // ====================================================================
  if (hadCache) {
    removeSdFile(USER_CACHE_FILE);
  }
  if (!renameSdFile(USER_CACHE_TEMP_FILE, USER_CACHE_FILE)) {
    error = "Cannot replace local user cache (rename failed).";
    Serial.printf("[CACHE] FAIL: %s\n", error.c_str());
    debugSdStatus();
    return false;
  }

  Serial.println(F("[CACHE] upsertCachedUser() SUCCESS"));
  return true;
}

String cachedUserLine(const LocalUser &user) {
  return cacheSafe(user.userId) + "|" + cacheSafe(user.idNumber) + "|" + cacheSafe(user.fullName) + "|" + cacheSafe(user.fingerprintId) + "|" + cacheSafe(user.smartCardId);
}

void writeCachedUserLine(File &file, const LocalUser &user) {
  file.println(cachedUserLine(user));
}

String cacheSafe(String value) {
  value.replace("|", " ");
  value.replace("\r", " ");
  value.replace("\n", " ");
  return value;
}

AttendanceResult postAttendance(const String &fingerprintId, const String &rfidUid, const String &occurredAt, const String &localRecordId) {
  AttendanceResult result;
  DynamicJsonDocument request(1536);
  DynamicJsonDocument response(4096);
  int httpCode = 0;
  String error;

  request["fingerprintId"] = fingerprintId;
  request["smartCardId"] = rfidUid;
  request["occurredAt"] = occurredAt;
  request["localRecordId"] = localRecordId;

  result.ok = postDeviceJson("attendance", request, response, httpCode, error);
  result.httpCode = httpCode;
  result.error = error;
  databaseReady = result.ok || (httpCode > 0 && httpCode < 500);

  if (!result.ok) {
    return result;
  }

  JsonObject user = response["user"].as<JsonObject>();
  result.duplicate = response["duplicate"] | false;
  result.attendanceId = String((int) (response["attendanceId"] | 0));
  result.idNumber = String((const char *) (user["idNumber"] | ""));
  if (result.idNumber.length() == 0) {
    result.idNumber = String((int) (user["id"] | 0));
  }
  result.fullName = String((const char *) (user["fullName"] | ""));
  result.status = String((const char *) (response["status"] | ""));
  result.date = String((const char *) (response["date"] | ""));
  result.time = String((const char *) (response["time"] | ""));
  return result;
}

void runRegistrationWorkflow() {
  if (mode == MODE_REGISTER_FINGERPRINT) {
    if (registrationCancelRequested) {
      registrationPhase = "cancelled";
      drawScreen("Registration", "Cancelled", "", "", ILI9341_YELLOW);
      logEvent("REG", "Registration cancelled before fingerprint scan");
      mode = MODE_HOME;
      return;
    }
    if (!fingerprintReady) {
      registrationPhase = "error";
      registrationError = "Fingerprint sensor is not ready.";
      drawScreen("Registration", "Fingerprint Sensor", "Not Ready", "", ILI9341_RED);
      logEvent("REG", registrationError);
      signalError();
      mode = MODE_HOME;
      return;
    }

    registrationPhase = "fingerprint";
    String fpError;
    bool enrolled = enrollFingerprint(pendingFingerprintTemplateId, fpError);
    if (!enrolled) {
      registrationPhase = "error";
      registrationError = fpError.length() ? fpError : "Fingerprint mismatch.";
      drawScreen("Registration", fpError.length() ? fpError : "Fingerprint Mismatch", "Please Try Again", "", ILI9341_RED);
      logEvent("REG", "Fingerprint failed for " + pendingRegistrationName + ": " + registrationError);
      signalError();
      mode = MODE_HOME;
      return;
    }

    registrationPhase = "rfid";
    drawScreen("Registration", "Fingerprint Registered", "Scan ID Card Next", "", ILI9341_GREEN);
    signalSuccess();
    mode = MODE_REGISTER_RFID;
    return;
  }

  if (mode == MODE_REGISTER_RFID) {
    if (registrationCancelRequested) {
      finger.deleteModel(pendingFingerprintTemplateId);
      registrationPhase = "cancelled";
      drawScreen("Registration", "Cancelled", "Fingerprint rolled back", "", ILI9341_YELLOW);
      logEvent("REG", "Registration cancelled after fingerprint scan; template rolled back");
      mode = MODE_HOME;
      return;
    }
    if (!nfcReady) {
      registrationPhase = "error";
      registrationError = "RFID reader is not ready.";
      finger.deleteModel(pendingFingerprintTemplateId);
      drawScreen("Registration", "RFID Reader", "Not Ready", "", ILI9341_RED);
      logEvent("REG", registrationError + " Template rolled back.");
      signalError();
      mode = MODE_HOME;
      return;
    }

    String uid;
    bool rfidOk = enrollRfid(uid);
    if (!rfidOk) {
      registrationPhase = "error";
      registrationError = "RFID scan mismatch or timeout.";
      finger.deleteModel(pendingFingerprintTemplateId);
      drawScreen("Registration", "RFID Mismatch", "Please Try Again", "", ILI9341_RED);
      logEvent("REG", registrationError + " Template rolled back.");
      signalError();
      mode = MODE_HOME;
      return;
    }

    pendingRfidUid = uid;

    // ================================================================
    // Save locally FIRST — always, regardless of API status.
    // ================================================================
    registrationPhase = "local";
    String localSaveError;
    bool localOk = false;
    if (sdReady) {
      localOk = saveCredentialsLocally(pendingFingerprintTemplateId, pendingRfidUid, localSaveError);
    }
    if (!localOk) {
      finger.deleteModel(pendingFingerprintTemplateId);
      registrationPhase = "error";
      registrationError = localSaveError.length() ? localSaveError : "SD card save failed.";
      drawScreen("Registration Failed", "Local Save Failed", registrationError, "Fingerprint rolled back", ILI9341_RED);
      logEvent("REG", "Local save failed for " + pendingRegistrationName + ": " + registrationError);
      signalError();
      mode = MODE_HOME;
      return;
    }

    // ================================================================
    // Try online API. Keep local save even if API fails.
    // ================================================================
    registrationPhase = "api";
    drawScreen("Registration", "Saving Online", pendingRegistrationName, "Please wait", ILI9341_BLUE);

    String apiError;
    bool registered = registerCredentials(pendingFingerprintTemplateId, pendingRfidUid, apiError);

    if (registered) {
      registrationPhase = "complete";
      drawScreen("Registration Complete", "ID: " + (pendingRegistrationIdNumber.length() ? pendingRegistrationIdNumber : String(pendingRegistrationUserId)), pendingRegistrationName, "Saved Online + Local", ILI9341_GREEN);
      logEvent("REG", "Registration complete for " + pendingRegistrationName + " FP " + String(pendingFingerprintTemplateId) + " RFID " + pendingRfidUid);
    } else {
      registrationPhase = "complete";
      drawScreen("Registration Done", "ID: " + (pendingRegistrationIdNumber.length() ? pendingRegistrationIdNumber : String(pendingRegistrationUserId)), pendingRegistrationName, "Saved Locally - Will Sync", ILI9341_YELLOW);
      logEvent("REG", "Registration saved locally for " + pendingRegistrationName + " FP " + String(pendingFingerprintTemplateId) + " RFID " + pendingRfidUid + " (online: " + apiError + ")");
    }

    signalSuccess();
    delay(2500);

    pendingRegistrationUserId = 0;
    pendingRegistrationIdNumber = "";
    pendingRegistrationName = "";
    pendingFingerprintTemplateId = 0;
    pendingRfidUid = "";
    registrationCancelRequested = false;
    mode = MODE_HOME;
  }
}

bool enrollFingerprint(uint16_t templateId, String &errorMsg) {
  // Pre-check: ensure the template slot isn't already occupied
  if (finger.loadModel(templateId) == FINGERPRINT_OK) {
    errorMsg = "Fingerprint already registered for this user.";
    return false;
  }

  // --- Scan 1: capture first image to char buffer 1 ---
  drawScreen("Fingerprint", "Please Put Your Finger", "Scan 1 of " + String(FINGERPRINT_REGISTER_SCANS), "", ILI9341_BLUE);
  if (!waitForFingerprintImage(1, FINGER_SCAN_TIMEOUT_MS)) {
    errorMsg = "Fingerprint scan timed out.";
    return false;
  }
  signalFingerprint();
  drawScreen("Fingerprint", "Scan 1 of " + String(FINGERPRINT_REGISTER_SCANS), "Accepted", "Remove finger", ILI9341_BLUE);
  waitForFingerRelease(8000);
  delay(450);

  // --- Scan 2: capture second image to char buffer 2, then combine ---
  drawScreen("Fingerprint", "Same Finger Again", "Scan 2 of " + String(FINGERPRINT_REGISTER_SCANS), "", ILI9341_BLUE);
  if (!waitForFingerprintImage(2, FINGER_SCAN_TIMEOUT_MS)) {
    errorMsg = "Fingerprint scan timed out.";
    return false;
  }
  if (finger.createModel() != FINGERPRINT_OK) {
    errorMsg = "Fingerprints do not match. Please try again.";
    return false;
  }
  signalFingerprint();
  drawScreen("Fingerprint", "Scan 2 of " + String(FINGERPRINT_REGISTER_SCANS), "Accepted", "Remove finger", ILI9341_BLUE);
  waitForFingerRelease(8000);
  delay(450);

  // --- Scan 3 onward: store the model, then verify the same finger ---
  if (finger.storeModel(templateId) != FINGERPRINT_OK) {
    errorMsg = "Failed to store fingerprint model.";
    return false;
  }

  if (FINGERPRINT_REGISTER_SCANS >= 3) {
    drawScreen("Fingerprint", "Same Finger Again", "Scan 3 of " + String(FINGERPRINT_REGISTER_SCANS), "", ILI9341_BLUE);
    if (!waitForFingerprintImage(1, FINGER_SCAN_TIMEOUT_MS)) {
      // Model is already stored; treat a verify-timeout as non-fatal.
      return true;
    }

    signalFingerprint();
    drawScreen("Fingerprint", "Scan 3 of " + String(FINGERPRINT_REGISTER_SCANS), "Accepted", "Remove finger", ILI9341_BLUE);
    waitForFingerRelease(8000);
    delay(450);

    // Quick verification search against the stored model
    uint8_t searchResult = finger.fingerFastSearch();
    if (searchResult == FINGERPRINT_OK) {
      return true;  // Verified — the stored print matches scan 3
    }
    // Verification didn't match; model is already stored so don't undo it.
    // Still return success — captures 1+2 were consistent via createModel().
  }

  return true;
}

bool waitForFingerprintImage(uint8_t slot, uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    serviceWeb();
    if (registrationCancelRequested) {
      return false;
    }
    uint8_t imageStatus = finger.getImage();
    if (imageStatus == FINGERPRINT_OK) {
      uint8_t convertStatus = finger.image2Tz(slot);
      return convertStatus == FINGERPRINT_OK;
    }
    delay(120);
  }
  return false;
}

bool waitForFingerRelease(uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    serviceWeb();
    if (finger.getImage() == FINGERPRINT_NOFINGER) {
      return true;
    }
    delay(120);
  }
  return false;
}

uint16_t fingerprintTemplateForUser(int userId) {
  uint16_t capacity = finger.capacity > 0 ? finger.capacity : 1000;
  return (uint16_t) (((max(1, userId) - 1) % capacity) + 1);
}

bool enrollRfid(String &uid) {
  String firstUid;

  for (int scan = 1; scan <= RFID_REGISTER_SCANS; scan++) {
    drawScreen("RFID Registration", "Please Scan Your ID Card", String("Scan ") + String(scan) + " of " + String(RFID_REGISTER_SCANS), "", ILI9341_YELLOW);

    String currentUid;
    uint32_t startedAt = millis();
    while (currentUid.length() == 0 && millis() - startedAt < RFID_SCAN_TIMEOUT_MS) {
      serviceWeb();
      if (registrationCancelRequested) {
        return false;
      }
      readRfidUid(currentUid, 250);
    }
    if (currentUid.length() == 0) {
      return false;
    }

    if (scan == 1) {
      firstUid = currentUid;
    } else if (currentUid != firstUid) {
      return false;
    }

    signalRfid();
    delay(500);
  }

  uid = firstUid;
  drawScreen("RFID Registration", "RFID Registered", uid, "", ILI9341_GREEN);
  signalSuccess();
  return true;
}

bool readRfidUid(String &uid, uint16_t timeoutMs) {
  uint8_t uidBuffer[7];
  uint8_t uidLength = 0;

  bool found = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uidBuffer, &uidLength, timeoutMs);
  if (!found || uidLength == 0) {
    return false;
  }

  uid = bytesToHex(uidBuffer, uidLength);
  return true;
}

String bytesToHex(const uint8_t *bytes, uint8_t length) {
  static const char hex[] = "0123456789ABCDEF";
  String value;
  value.reserve(length * 2);

  for (uint8_t i = 0; i < length; i++) {
    value += hex[(bytes[i] >> 4) & 0x0F];
    value += hex[bytes[i] & 0x0F];
  }

  return value;
}

void runAttendanceWorkflow() {
  if (mode == MODE_HOME) {
    int fingerprintId = scanFingerprintForAttendance();
    if (fingerprintId > 0) {
      attendanceFingerprintId = String(fingerprintId);
      signalFingerprint();
      drawScreen(
          String("Attendance"),
          String("Please Tap ID Card"),
          String("Verifying..."),
          String(""),
          (uint16_t)ILI9341_BLUE
      );
      attendanceRfidStartedAt = millis();
      mode = MODE_WAIT_RFID_ATTENDANCE;
    }
    return;
  }

  if (mode == MODE_WAIT_RFID_ATTENDANCE) {
    if (millis() - attendanceRfidStartedAt > RFID_SCAN_TIMEOUT_MS) {
      drawScreen("Attendance", "RFID Timeout", "Please Try Again", "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    String uid;
    if (readRfidUid(uid, 250)) {
      attendanceRfidUid = uid;
      signalRfid();
      completeAttendanceAttempt();
      mode = MODE_HOME;
    }
  }
}

int scanFingerprintForAttendance() {
  if (!fingerprintReady) {
    return -1;
  }

  uint8_t imageStatus = finger.getImage();
  if (imageStatus != FINGERPRINT_OK) {
    return -1;
  }

  if (finger.image2Tz() != FINGERPRINT_OK) {
    return -1;
  }

  if (finger.fingerFastSearch() != FINGERPRINT_OK) {
    drawScreen("Attendance", "Fingerprint Not Recognized", "Please Try Again", "", ILI9341_RED);
    signalError();
    waitForFingerRelease(5000);
    return -1;
  }

  waitForFingerRelease(5000);
  return finger.fingerID;
}

void completeAttendanceAttempt() {
  String occurredAt = isoNow();
  String localRecordId = makeLocalRecordId();
  LocalUser cached = findCachedUserByCredentials(attendanceFingerprintId, attendanceRfidUid);
  if (!cached.found) {
    drawScreen("Access Denied", "RFID mismatch", "No Local Match", "Access Denied", ILI9341_RED);
    logEvent("ATTENDANCE", "Denied local mismatch FP " + attendanceFingerprintId + " RFID " + attendanceRfidUid);
    signalUnauthorized();
    delay(2500);
    return;
  }

  DateTime now = currentDateTime();
  String date = String(now.year()) + "-" + (now.month() < 10 ? "0" : "") + String(now.month()) + "-" + (now.day() < 10 ? "0" : "") + String(now.day());
  char timeBuffer[12];
  snprintf(timeBuffer, sizeof(timeBuffer), "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
  String localId = cached.idNumber.length() ? cached.idNumber : cached.userId;
  String status = localNextStatus(date, localId);
  if (status == "OUT") {
    int elapsedMinutes = minutesSinceLastIn(date, localId, now);
    if (elapsedMinutes >= 0 && elapsedMinutes <= (int) outDelayMinutes) {
      int waitMinutes = outDelayMinutes - elapsedMinutes;
      drawScreen("Attendance Blocked", "OUT Not Allowed", "Wait " + String(waitMinutes) + " min", cached.fullName, ILI9341_RED);
      logEvent("ATTENDANCE", "Blocked early OUT for " + localId + " after " + String(elapsedMinutes) + " minutes");
      signalError();
      delay(2500);
      return;
    }
  }

  appendAttendanceCsv(date, String(timeBuffer), localId, cached.fullName, status);
  AttendanceResult result = postAttendance(attendanceFingerprintId, attendanceRfidUid, occurredAt, localRecordId);
  if (!result.ok) {
    queueOfflineAttendance(localRecordId, occurredAt, attendanceFingerprintId, attendanceRfidUid);
    logEvent("ATTENDANCE", "Saved offline " + status + " for " + localId + " " + cached.fullName);
  } else {
    logEvent("ATTENDANCE", "Uploaded " + status + " for " + localId + " " + cached.fullName);
  }

  drawScreen(result.ok ? "Attendance Success" : "Saved Local", String("ID: ") + localId, cached.fullName, String("Status: ") + status, result.ok ? ILI9341_GREEN : ILI9341_YELLOW);
  signalSuccess();
  delay(2500);
}

void ensureSdFiles() {
  if (!sdReady) {
    return;
  }

  if (!sdFileExists(ATTENDANCE_FILE)) {
    File file = openSdFile(ATTENDANCE_FILE, FILE_WRITE);
    if (file) {
      file.println("Date,Time,ID,Name,Status");
      closeSdFile(file);
    }
  }

  if (!sdFileExists(UNSENT_FILE)) {
    File file = openSdFile(UNSENT_FILE, FILE_WRITE);
    if (file) {
      closeSdFile(file);
    }
  }

  if (!sdFileExists(USER_CACHE_FILE)) {
    File file = openSdFile(USER_CACHE_FILE, FILE_WRITE);
    if (file) {
      closeSdFile(file);
    }
  }

  if (!sdFileExists(DEVICE_LOG_FILE)) {
    File file = openSdFile(DEVICE_LOG_FILE, FILE_WRITE);
    if (file) {
      closeSdFile(file);
    }
  }
}

void appendLine(const char *path, const String &line) {
  if (!sdReady) {
    return;
  }

  File file = openSdFile(path, FILE_APPEND);
  if (!file) {
    return;
  }
  file.println(line);
  closeSdFile(file);
}

void logEvent(const String &category, const String &message) {
  if (!sdReady) {
    Serial.printf("[LOG] %s | %s\n", category.c_str(), message.c_str());
    return;
  }
  appendLine(DEVICE_LOG_FILE, isoNow() + "|" + cacheSafe(category) + "|" + cacheSafe(message));
}

String csvEscape(String value) {
  bool quoted = value.indexOf(',') >= 0 || value.indexOf('"') >= 0;
  value.replace("\"", "\"\"");
  if (quoted) {
    value = "\"" + value + "\"";
  }
  return value;
}

void appendAttendanceCsv(const String &date, const String &time, const String &id, const String &name, const String &status) {
  appendLine(ATTENDANCE_FILE, date + "," + time + "," + csvEscape(id) + "," + csvEscape(name) + "," + status);
}

void queueOfflineAttendance(const String &localRecordId, const String &occurredAt, const String &fingerprintId, const String &rfidUid) {
  appendLine(UNSENT_FILE, localRecordId + "|" + occurredAt + "|" + fingerprintId + "|" + rfidUid + "|" + deviceId);
  _pendingQueueCacheValid = false;
}

void syncOfflineRecords() {
  if (!sdReady || !wifiReady || !sdFileExists(UNSENT_FILE)) {
    return;
  }

  File input = openSdFile(UNSENT_FILE, FILE_READ);
  if (!input) {
    return;
  }

  removeSdFile(UNSENT_TEMP_FILE);
  File output = openSdFile(UNSENT_TEMP_FILE, FILE_WRITE);
  bool anyFailed = false;
  bool anySynced = false;

  while (input.available()) {
    String line = input.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) {
      continue;
    }

    String localRecordId = fieldAt(line, '|', 0);
    String occurredAt = fieldAt(line, '|', 1);
    String fingerprintId = fieldAt(line, '|', 2);
    String rfidUid = fieldAt(line, '|', 3);

    AttendanceResult result = postAttendance(fingerprintId, rfidUid, occurredAt, localRecordId);
    if (result.ok) {
      anySynced = true;
      continue;
    }

    anyFailed = true;
    if (output) {
      output.println(line);
    }
  }

  closeSdFile(input);
  closeSdFile(output);

  removeSdFile(UNSENT_FILE);
  if (anyFailed) {
    renameSdFile(UNSENT_TEMP_FILE, UNSENT_FILE);
  } else {
    removeSdFile(UNSENT_TEMP_FILE);
    File emptyQueue = openSdFile(UNSENT_FILE, FILE_WRITE);
    if (emptyQueue) {
      closeSdFile(emptyQueue);
    }
  }
  _pendingQueueCacheValid = false;

  if (anySynced) {
    logEvent("SYNC", "Uploaded pending attendance records");
    signalSuccess();
  }
}

LocalUser findCachedUserByCredentials(const String &fingerprintId, const String &rfidUid) {
  LocalUser result;
  if (!sdReady || !sdFileExists(USER_CACHE_FILE)) {
    return result;
  }

  File cache = openSdFile(USER_CACHE_FILE, FILE_READ);
  while (cache && cache.available()) {
    String line = cache.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) {
      continue;
    }

    String cachedFingerprint = fieldAt(line, '|', 3);
    String cachedCard = fieldAt(line, '|', 4);
    if (cachedFingerprint == fingerprintId && cachedCard == rfidUid) {
      result.found = true;
      result.userId = fieldAt(line, '|', 0);
      result.idNumber = fieldAt(line, '|', 1);
      result.fullName = fieldAt(line, '|', 2);
      result.fingerprintId = cachedFingerprint;
      result.smartCardId = cachedCard;
      break;
    }
  }

  closeSdFile(cache);
  return result;
}

String localNextStatus(const String &date, const String &id) {
  if (!sdReady || !sdFileExists(ATTENDANCE_FILE)) {
    return "IN";
  }

  File file = openSdFile(ATTENDANCE_FILE, FILE_READ);
  int count = 0;
  while (file && file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() == 0 || line.startsWith("Date,")) {
      continue;
    }
    if (fieldAt(line, ',', 0) == date && fieldAt(line, ',', 2) == id) {
      count++;
    }
  }
  closeSdFile(file);

  return count % 2 == 0 ? "IN" : "OUT";
}

int hhmmssToMinutes(const String &value) {
  if (value.length() < 5) {
    return -1;
  }
  int hour = value.substring(0, 2).toInt();
  int minute = value.substring(3, 5).toInt();
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return -1;
  }
  return hour * 60 + minute;
}

int minutesSinceLastIn(const String &date, const String &id, const DateTime &now) {
  if (!sdReady || !sdFileExists(ATTENDANCE_FILE)) {
    return -1;
  }

  File file = openSdFile(ATTENDANCE_FILE, FILE_READ);
  int lastInMinute = -1;
  while (file && file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() == 0 || line.startsWith("Date,")) {
      continue;
    }
    if (fieldAt(line, ',', 0) == date && fieldAt(line, ',', 2) == id && fieldAt(line, ',', 4) == "IN") {
      int minute = hhmmssToMinutes(fieldAt(line, ',', 1));
      if (minute >= 0) {
        lastInMinute = minute;
      }
    }
    serviceWeb();
  }
  closeSdFile(file);

  if (lastInMinute < 0) {
    return -1;
  }
  int currentMinute = now.hour() * 60 + now.minute();
  int elapsed = currentMinute - lastInMinute;
  if (elapsed < 0) {
    elapsed += 24 * 60;
  }
  return elapsed;
}

uint16_t pendingQueueCount() {
  if (_pendingQueueCacheValid) {
    return _pendingQueueCache;
  }
  if (!sdReady) {
    _pendingQueueCache = 0;
    _pendingQueueCacheValid = true;
    return 0;
  }
  File file = openSdFile(UNSENT_FILE, FILE_READ);
  uint16_t count = 0;
  if (file) {
    while (file.available()) {
      String line = file.readStringUntil('\n');
      line.trim();
      if (line.length() > 0) {
        count++;
      }
    }
    closeSdFile(file);
  }
  _pendingQueueCache = count;
  _pendingQueueCacheValid = true;
  return count;
}

String fieldAt(const String &line, char separator, int index) {
  int current = 0;
  int start = 0;
  for (int i = 0; i <= line.length(); i++) {
    if (i == line.length() || line.charAt(i) == separator) {
      if (current == index) {
        return line.substring(start, i);
      }
      current++;
      start = i + 1;
    }
  }
  return "";
}

String makeLocalRecordId() {
  DateTime now = currentDateTime();
  return deviceId + "-" + String(now.unixtime()) + "-" + String((uint32_t) millis());
}

void maintainWifi() {
  bool wasReady = wifiReady;
  wl_status_t status = WiFi.status();
  wifiReady = (status == WL_CONNECTED);

  // Update WiFi state machine based on actual connection status
  if (wifiReady) {
    wifiState = WIFI_STATE_CONNECTED;
  } else if (status == WL_CONNECT_FAILED || status == WL_NO_SSID_AVAIL) {
    wifiState = WIFI_STATE_CONNECTION_FAILED;
  } else if (status == WL_CONNECTION_LOST) {
    wifiState = WIFI_STATE_RECONNECTING;
  } else if (status == WL_IDLE_STATUS) {
    wifiState = (wifiSsid.length() > 0) ? WIFI_STATE_CONNECTING : WIFI_STATE_DISCONNECTED;
  } else { // WL_DISCONNECTED
    if (wifiSsid.length() > 0 && millis() - lastWifiReconnectAt < 30000) {
      wifiState = WIFI_STATE_RECONNECTING;
    } else {
      wifiState = WIFI_STATE_DISCONNECTED;
    }
  }

  // Handle transition events
  if (wifiReady && !wasReady) {
    logEvent("WIFI", "Station connection restored at " + WiFi.localIP().toString());
    syncClock();
    checkApiStatus();
  }
  if (!wifiReady && wasReady) {
    databaseReady = false;
    logEvent("WIFI", "Station connection lost");
  }
  if (wifiReady || wifiSsid.length() == 0) {
    return;
  }

  if (millis() - lastWifiReconnectAt < 15000) {
    return;
  }

  lastWifiReconnectAt = millis();
  WiFi.disconnect();
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
}

String normalizeSdPath(String path) {
  path.trim();
  path.replace("\\", "/");
  if (path.length() == 0) {
    path = "/";
  }
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  while (path.indexOf("//") >= 0) {
    path.replace("//", "/");
  }
  if (path.indexOf("..") >= 0) {
    return "";
  }
  if (path.length() > 1 && path.endsWith("/")) {
    path.remove(path.length() - 1);
  }
  return path;
}

String parentSdPath(const String &path) {
  if (path == "/") {
    return "/";
  }
  int slash = path.lastIndexOf('/');
  if (slash <= 0) {
    return "/";
  }
  return path.substring(0, slash);
}

String sdChildPath(const String &parentPath, const String &childName) {
  if (parentPath == "/") {
    return "/" + childName;
  }
  return parentPath + "/" + childName;
}

String urlEncode(const String &value) {
  static const char hex[] = "0123456789ABCDEF";
  String encoded;
  encoded.reserve(value.length() * 3);
  for (size_t i = 0; i < value.length(); i++) {
    char c = value.charAt(i);
    bool safe = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~' || c == '/';
    if (safe) {
      encoded += c;
    } else {
      encoded += '%';
      encoded += hex[((uint8_t) c >> 4) & 0x0F];
      encoded += hex[(uint8_t) c & 0x0F];
    }
  }
  return encoded;
}

String fileSizeLabel(uint32_t size) {
  if (size < 1024) {
    return String(size) + " B";
  }
  if (size < 1024UL * 1024UL) {
    return String(size / 1024.0, 1) + " KB";
  }
  return String(size / 1048576.0, 1) + " MB";
}

String backupFilePathForName(const String &name) {
  if (name == "attendance") {
    return ATTENDANCE_FILE;
  }
  if (name == "queue") {
    return UNSENT_FILE;
  }
  if (name == "users") {
    return USER_CACHE_FILE;
  }
  if (name == "logs") {
    return DEVICE_LOG_FILE;
  }
  return "";
}

// ---- SD card diagnostics ----
void debugSdStatus() {
  Serial.println(F("[SD DEBUG] ========== SD Card Diagnostics =========="));
  Serial.printf("  sdReady flag: %s\n", sdReady ? "true" : "false");
  Serial.printf("  Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.printf("  Largest allocable block: %u bytes\n", ESP.getMaxAllocHeap());
  Serial.printf("  SPI pins: SCLK=%d MISO=%d MOSI=%d\n", SPI_SCLK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN);
  Serial.printf("  CS pins: TFT=%d SD=%d\n", TFT_CS_PIN, SD_CS_PIN);

  if (!sdReady) {
    Serial.println(F("[SD DEBUG] SD not marked ready — skipping hardware checks"));
    Serial.println(F("[SD DEBUG] =========================================="));
    return;
  }

  // Deselect everything and access SD
  beginSdAccess();

  uint8_t cardType = SD.cardType();
  Serial.printf("  Card type: %u ", cardType);
  switch (cardType) {
    case CARD_NONE:  Serial.println(F("(NONE — no card detected!)")); break;
    case CARD_MMC:   Serial.println(F("(MMC)")); break;
    case CARD_SD:    Serial.println(F("(SD)")); break;
    case CARD_SDHC:  Serial.println(F("(SDHC)")); break;
    default:         Serial.println(F("(UNKNOWN)")); break;
  }

  if (cardType != CARD_NONE) {
    uint64_t cardSizeMB = SD.cardSize() / (1024 * 1024);
    Serial.printf("  Card size: %llu MB\n", cardSizeMB);
    Serial.printf("  Total bytes: %llu\n", SD.totalBytes());
    Serial.printf("  Used bytes: %llu\n", SD.usedBytes());
  }

  // Test write capability
  const char *testPath = "/sd_debug_write_test.tmp";
  File testFile = SD.open(testPath, FILE_WRITE);
  if (testFile) {
    size_t written = testFile.println("debug ok");
    testFile.close();
    SD.remove(testPath);
    Serial.printf("  Write test: PASS (wrote %u bytes to %s)\n", written, testPath);
  } else {
    Serial.printf("  Write test: FAIL — cannot create %s\n", testPath);
  }

  // Check if the critical files exist
  Serial.printf("  %s exists: %s\n", USER_CACHE_FILE, SD.exists(USER_CACHE_FILE) ? "yes" : "no");
  Serial.printf("  %s exists: %s\n", ATTENDANCE_FILE, SD.exists(ATTENDANCE_FILE) ? "yes" : "no");
  Serial.printf("  %s exists: %s\n", UNSENT_FILE, SD.exists(UNSENT_FILE) ? "yes" : "no");

  endSdAccess();
  Serial.println(F("[SD DEBUG] =========================================="));
}

// ---- Local-only credential save (no API) ----
bool saveCredentialsLocally(uint16_t fingerprintId, const String &rfidUid, String &error) {
  Serial.println(F("[SAVE] saveCredentialsLocally() called"));

  LocalUser newUser;
  newUser.found = true;
  newUser.userId = String(pendingRegistrationUserId);
  // Use the name as idNumber fallback when we don't have a separate ID number
  newUser.idNumber = String(pendingRegistrationUserId);
  newUser.fullName = pendingRegistrationName;
  newUser.fingerprintId = String(fingerprintId);
  newUser.smartCardId = rfidUid;

  Serial.printf("[SAVE] Built LocalUser: userId=%s idNumber=%s name=%s fp=%s rfid=%s\n",
                newUser.userId.c_str(), newUser.idNumber.c_str(),
                newUser.fullName.c_str(), newUser.fingerprintId.c_str(),
                newUser.smartCardId.c_str());

  // Ensure SD files exist (creates empty cache file if missing)
  if (sdReady && !sdFileExists(USER_CACHE_FILE)) {
    Serial.println(F("[SAVE] No user cache file yet, creating empty one..."));
    File f = openSdFile(USER_CACHE_FILE, FILE_WRITE);
    if (f) {
      closeSdFile(f);
      Serial.println(F("[SAVE] Empty cache file created"));
    } else {
      Serial.println(F("[SAVE] WARNING: Could not create empty cache file"));
    }
  }

  bool ok = upsertCachedUser(newUser, error);
  Serial.printf("[SAVE] upsertCachedUser returned: %s\n", ok ? "true" : "false");
  if (!ok) {
    Serial.printf("[SAVE] Error: %s\n", error.c_str());
  }
  return ok;
}

// ---- Clear all cached data on SD and fingerprint sensor ----
void handleApiCacheClear() {
  if (!requireApiAdmin()) {
    return;
  }

  int cleared = 0;
  int errors = 0;
  String logMsg;

  // 1. Fingerprint sensor: delete all stored templates
  if (fingerprintReady) {
    Serial.println(F("[CACHE] Emptying fingerprint database..."));
    uint8_t result = finger.emptyDatabase();
    if (result == FINGERPRINT_OK) {
      cleared++;
      logMsg += "FP ";
      Serial.println(F("[CACHE] Fingerprint database cleared"));
    } else {
      errors++;
      Serial.printf("[CACHE] Fingerprint emptyDatabase failed: %u\n", result);
    }
  }

  // 2. SD card user cache files
  if (sdReady) {
    const char *files[] = {USER_CACHE_FILE, USER_CACHE_TEMP_FILE, UNSENT_FILE, UNSENT_TEMP_FILE, DEVICE_LOG_FILE};
    for (unsigned i = 0; i < sizeof(files) / sizeof(files[0]); i++) {
      if (sdFileExists(files[i])) {
        if (removeSdFile(files[i])) {
          cleared++;
          logMsg += String(files[i]) + " ";
        } else {
          errors++;
          Serial.printf("[CACHE] Failed to remove %s\n", files[i]);
        }
      }
    }

    // 3. Attendance CSV: recreate with header
    if (sdFileExists(ATTENDANCE_FILE)) {
      if (removeSdFile(ATTENDANCE_FILE)) {
        cleared++;
      } else {
        errors++;
        Serial.println(F("[CACHE] Failed to remove attendance.csv"));
      }
    }
    File attFile = openSdFile(ATTENDANCE_FILE, FILE_WRITE);
    if (attFile) {
      attFile.println("Date,Time,ID,Name,Status");
      closeSdFile(attFile);
      cleared++;
    } else {
      errors++;
      Serial.println(F("[CACHE] Failed to recreate attendance.csv"));
    }

    // 4. Recreate empty files that the device expects
    File unsent = openSdFile(UNSENT_FILE, FILE_WRITE);
    if (unsent) closeSdFile(unsent);
    File logFile = openSdFile(DEVICE_LOG_FILE, FILE_WRITE);
    if (logFile) closeSdFile(logFile);
    _pendingQueueCache = 0;
    _pendingQueueCacheValid = true;
  }

  String result = (errors == 0) ? "Cache cleared" : "Cleared with " + String(errors) + " errors";
  logMsg.trim();
  logEvent("CACHE", "Cache clear: " + logMsg + "(" + result + ")");

  drawScreen("Cache Cleared", "Fingerprint + SD", logMsg, result, errors == 0 ? ILI9341_GREEN : ILI9341_YELLOW);

  String payload;
  payload.reserve(256);
  payload += F("{\"ok\":true,\"cleared\":"); payload += String(cleared);
  payload += F(",\"errors\":"); payload += String(errors);
  payload += F(",\"message\":\""); payload += jsonEscape(result); payload += F("\"}");
  sendJson(200, payload);
}
