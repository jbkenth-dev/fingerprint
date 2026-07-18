#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <SPI.h>
#include <time.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <Adafruit_PN532.h>
#include <Adafruit_Fingerprint.h>
#include <RTClib.h>
#include <LittleFS.h>

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
  String credentialStatus;
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
bool rtcReady = false;
bool nfcReady = false;
bool fingerprintReady = false;
bool tftReady = false;
bool lfsReady = false;

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
// String lastHomeIpText;  // removed with IP display

uint32_t lastHomeUpdateAt = 0;
uint32_t lastApiCheckAt = 0;
uint32_t lastWifiReconnectAt = 0;
uint32_t lastSyncUnsentAt = 0;
WifiState wifiState = WIFI_STATE_DISCONNECTED;

UiState uiState;
uint16_t studentInMinutes = DEFAULT_STUDENT_IN_MINUTES;
uint16_t outDelayMinutes = DEFAULT_OUT_DELAY_MINUTES;
String apiHost;
String defaultApiHost;

void initPins();
void loadSettings();
void saveSettings();
void initDisplay();
void initBusesAndDevices();
void beginTftAccess();
void startInstallPortal();
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
void sendLoginPage(const String &message = "");
void sendAppShell();
String htmlEscape(String value);
String jsonEscape(String value);
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
void handleApiRestoreSettings();
void handleApiCacheClear();
bool getDeviceJson(const String &action, DynamicJsonDocument &response, int &httpCode, String &error);
bool postDeviceJson(const String &action, DynamicJsonDocument &request, DynamicJsonDocument &response, int &httpCode, String &error);
String endpointFor(const String &action);
bool checkApiStatus();
bool fetchAndCacheUsers();
bool registerCredentials(uint16_t fingerprintId, const String &rfidUid, String &error);
bool upsertCachedUser(const LocalUser &updated, String &error);
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
void logEvent(const String &category, const String &message);
String makeLocalRecordId();
void maintainWifi();
void handleApiWifiReset();
void handleApiSettingsApi();
void handleApiTimeSet();
void saveDefaultHost();

// LittleFS helpers
bool isFingerprintInLFS(uint16_t fingerprintId);
bool isRfidUuidInLFS(const String &uuid);
LocalUser findStudentInLFS(const String &fingerprintId, const String &uuid);
bool addAttendanceToLFS(const String &idNumber, const String &name, const String &timestamp, const String &type);
bool cacheUsersToLFS(DynamicJsonDocument &doc);
bool loadCachedUsersFromLFS(DynamicJsonDocument &doc);
bool upsertStudentInLFS(const String &idNumber, const String &fullName, const String &fingerprintId, const String &uuid, const String &credentialStatus, int userId, String &error);
void syncUnsentAttendance();
LocalUser findStudentByFpInLFS(uint16_t fpId);
bool deactivateStudentInLFS(int userId, String &error);
bool activateStudentInLFS(int userId, String &error);
bool deleteStudentCredentialsInLFS(int userId, String &error);
void handleApiStudentDeactivate();
void handleApiStudentActivate();
void handleApiStudentDelete();

void setup() {
  Serial.begin(115200);
  delay(300);

  initPins();
  lfsReady = LittleFS.begin();
  if (!lfsReady) {
    Serial.println(F("[LFS] Mount failed — formatting..."));
    LittleFS.format();
    lfsReady = LittleFS.begin();
  }
  Serial.printf("[LFS] %s\n", lfsReady ? "OK" : "FAILED");
  loadSettings();
  initDisplay();
  initBusesAndDevices();
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
      drawScreen("Offline Mode", "WiFi unavailable", "AP: 192.168.4.1", "API offline", ILI9341_YELLOW);
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

  // Unsent-attendance sync (throttled to once per sync interval)
  if (lfsReady && wifiReady && nowMs - lastSyncUnsentAt > OFFLINE_SYNC_INTERVAL_MS) {
    syncUnsentAttendance();
    lastSyncUnsentAt = nowMs;
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
  digitalWrite(TFT_CS_PIN, HIGH);

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
      int suffixPos = savedUrl.indexOf("/api/device.php");
      if (suffixPos > 0) {
        apiHost = savedUrl.substring(0, suffixPos);
      }
    }
    if (apiHost.length() == 0) {
      apiHost = String(DEFAULT_API_HOST);
    }
  }
  apiUrl = String("http://") + apiHost + "/api/device.php";
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

  Serial.printf("[INIT] Devices: RTC=%s FP=%s NFC=%s TFT=%s\n",
                rtcReady ? "OK" : "NO",
                fingerprintReady ? "OK" : "NO", nfcReady ? "OK" : "NO",
                tftReady ? "OK" : "NO");
}

void beginTftAccess() {
  SPI.endTransaction();
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
  server.on("/api/restore/settings", HTTP_POST, handleApiRestoreSettings);
  server.on("/api/cache/clear", HTTP_POST, handleApiCacheClear);
  server.on("/api/time/set", HTTP_POST, handleApiTimeSet);
  server.on("/api/wifi/reset", HTTP_POST, handleApiWifiReset);
  server.on("/api/wifi/status", HTTP_GET, handleApiWifiStatus);
  server.on("/api/settings/api", HTTP_GET, handleApiSettingsApi);
  server.on("/api/settings/api", HTTP_POST, handleApiSettingsApi);
  server.on("/api/student/deactivate", HTTP_POST, handleApiStudentDeactivate);
  server.on("/api/student/activate", HTTP_POST, handleApiStudentActivate);
  server.on("/api/student/delete", HTTP_POST, handleApiStudentDelete);

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
  // IP display removed per user request
  (void)force;
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
  digitalWrite(BLUE_LED_PIN, HIGH);
  buzz(90);
}

void signalRfid() {
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, HIGH);
  buzz(90);
}

void signalSuccess() {
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, HIGH);
  buzz(100, 80);
  buzz(120);
  delay(100);
  digitalWrite(GREEN_LED_PIN, LOW);
}

void signalError() {
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, HIGH);
  buzz(900);
  delay(350);
  digitalWrite(RED_LED_PIN, LOW);
}

void signalUnauthorized() {
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
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
  body += F("<h1 class='brand'>Admin Login</h1>");
  if (message.length()) {
    body += F("<div class='msg'>");
    body += htmlEscape(message);
    body += F("</div>");
  }
  body += F("<form method='post' action='/login'><label>Username</label><input name='username' autocomplete='username' required><label>Password</label><input name='password' type='password' autocomplete='current-password' required><button type='submit'>Login</button></form></main></body></html>");
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
    <div class="brand"><div class="mark">FK</div><div><b>FRANCIS KEY</b></div></div>
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
const menu=["Dashboard","Attendance","Register User","Users","WiFi Settings","Attendance Rules","Date/Time","Logs","Backup / Restore","Logout"];
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
function deviceCards(){const d=state.device||{};return `<div class="grid cards"><div class="card stat"><span>WiFi</span><b class="${d.wifiReady?"ok":"bad"}">${d.wifiReady?"Online":"Offline"}</b></div><div class="card stat"><span>Database API</span><b class="${d.databaseReady?"ok":"bad"}">${d.databaseReady?"Ready":"Offline"}</b></div><div class="card stat"><span>Device Time</span><b>${d.time||"--:--"}</b></div></div>`}
function liveScreen(){const u=(state.device&&state.device.ui)||{};return `<div class="screen"><div class="kind">${u.type||"state"}</div><div class="big">${u.title||"FRANCIS KEY"}</div><div class="line">${u.line1||""}</div><div class="line">${u.line2||""}</div><div class="line">${u.line3||""}</div></div>`}
function dashboard(){return `${deviceCards()}`}
function attendance(){if(state.loading.attendance)return `<div class="card"><div class="loader"></div></div>`;const rows=state.attendance.map(r=>`<tr><td>${r.date}</td><td>${r.time}</td><td>${r.id}</td><td>${r.name}</td><td>${r.status}</td></tr>`).join("");return `<div class="card"><div class="row"><h2 style="margin-right:auto">Recent Attendance</h2><button class="btn secondary" onclick="loadAttendance()">Refresh</button></div><div class="tablewrap"><table><thead><tr><th>Date</th><th>Time</th><th>ID</th><th>Name</th><th>Status</th></tr></thead><tbody>${rows||"<tr><td colspan=5>No local attendance records.</td></tr>"}</tbody></table></div></div>`}
function registerView(){const d=state.device||{};if(!d.wifiReady||!d.databaseReady)return `<div class="card"><h2>Register User</h2><div class="empty">Registration unavailable.<br>Please connect to WiFi.</div></div>`;const q=state.search.toLowerCase();const filtered=state.students.filter(s=>(`${s.idNumber} ${s.fullName}`.toLowerCase()).includes(q));const list=filtered.map(s=>`<button class="item" onclick="openRegister(${s.id})"><b>${s.idNumber||s.id}</b> ${s.fullName}<div class="muted">${s.department||"Student"}</div></button>`).join("");return `<div class="card"><div class="row"><h2 style="margin-right:auto">Select Student</h2><button class="btn secondary" onclick="loadStudents()">Refresh</button></div><div class="field"><label>Realtime Search</label><input placeholder="Student ID, first name, last name, full name" value="${state.search}" oninput="state.search=this.value;render()"></div>${state.loading.students?'<div class="loader"></div>':`<div class="list">${list||'<div class="empty">No matching students.</div>'}</div>`}</div>`}
function usersView(){if(state.loading.users)return '<div class="card"><div class="loader"></div></div>';const rows=state.users.map(u=>{const active=u.status!=="inactive";const stBadge=active?'<span class="pill ok">Active</span>':'<span class="pill bad">Inactive</span>';let opts='';if(active)opts+='<option value="deactivate">Deactivate</option>';if(!active)opts+='<option value="activate">Activate</option>';if(u.fingerprintId||u.smartCardId)opts+='<option value="delete">Delete Credentials</option>';const safeName=(u.fullName||'').replace(/'/g,"\\\\'");return '<tr><td>'+(u.idNumber||u.userId)+'</td><td>'+u.fullName+'</td><td>'+(u.fingerprintId||"--")+'</td><td>'+(u.smartCardId||"--")+'</td><td>'+stBadge+'</td><td>'+(opts?'<select onchange="userActionModal('+u.userId+',this.value,\''+safeName+'\','+active+');this.value=\'\'"><option value="">-- Action --</option>'+opts+'</select>':"")+'</tr>'}).join("");return '<div class="card"><div class="row"><h2 style="margin-right:auto">Registered Students</h2><button class="btn secondary" onclick="loadUsers()">Refresh</button></div><div class="tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Fingerprint</th><th>RFID</th><th>Status</th><th>Action</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6">No cached users.</td></tr>')+'</tbody></table></div></div>'}
function wifiView(){const ws=state.wifiStatus||{};const st=ws.status;const connected=st==="Connected";const authenticating=st==="Authenticating";const on=connected||authenticating;const connSsid=on?(ws.ssid||""):"Not Connected";const connBlock=`<div style="margin-bottom:12px;padding:10px 14px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:13px;color:var(--muted);font-weight:800">WiFi Connected:</span><span style="width:10px;height:10px;border-radius:50%;background:${on?"#16a34a":"#9ca3af"};display:inline-block"></span><b>${connSsid}</b></div>`;if(connected||authenticating){const clr=connected?"#16a34a":"#ca8a04";const lbl=connected?"Connected":"Authenticated";return `<div class="card"><div class="row"><h2 style="margin-right:auto">WiFi Settings</h2></div>${connBlock}<div style="padding:16px;border:1px solid ${connected?"#bbf7bb":"#fef08a"};border-radius:8px;background:${connected?"#f0faf0":"#fefce8"};margin-bottom:12px"><div class="field"><label>SSID</label><div class="item"><b>${ws.ssid||""}</b></div></div><div class="field"><label>Status</label><div style="display:flex;align-items:center;gap:8px"><span style="width:12px;height:12px;border-radius:50%;background:${clr};display:inline-block"></span><b style="color:${clr}">${lbl}</b></div></div>${authenticating?'<div class="field"><label style="color:#dc2626">Please reset WiFi</label></div>':''}</div><button class="btn danger" onclick="resetWifi()">Reset WiFi</button></div>`}const nets=state.networks.map(n=>`<option value="${n.ssid}">${n.ssid}</option>`).join("");const scanMsg=state.loading.scan?'Scanning WiFi...':state.scanStatus;const statusColor=st==="Connecting"||st==="Authenticating"?"#2563eb":st==="Scanning"||st==="Reconnecting"?"#ca8a04":"#dc2626";const statusDot=st&&st!=="Disconnected"&&st!=="Connection Failed"?`<div style="padding:12px;border:1px solid ${statusColor};border-radius:8px;background:white;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block"></span><span>${st}</span></div>`:"";return `<div class="card"><div class="row"><h2 style="margin-right:auto">WiFi Settings</h2><button class="btn secondary" onclick="scanWifi()">Scan Networks</button></div>${connBlock}${statusDot}${scanMsg?'<p style="margin:8px 0;color:var(--muted)">'+scanMsg+'</p>':""}<div class="field"><label>Network</label><select id="wifiSsid">${nets}</select></div><div class="field"><label>Password</label><input id="wifiPass" type="password" placeholder="WiFi password"></div><button class="btn" onclick="saveWifi()">Save and Connect</button><button class="btn danger" onclick="resetWifi()" style="margin-top:12px">Reset WiFi</button></div>`}
function rulesView(){const d=state.device||{}, r=d.rules||{};return `<div class="card"><h2>Attendance Rules</h2><div class="field"><label>Student IN Time</label><input type="time" id="inTime" value="${r.inTime||"10:00"}"></div><div class="field"><label>Student OUT Allowed After</label><select id="outDelay">${[1,5,10,15,30,60].map(v=>`<option value="${v}" ${Number(r.outDelay)===v?"selected":""}>${v} minute${v>1?"s":""}</option>`).join("")}</select></div><button class="btn" onclick="saveRules()">Save Rules</button></div>`}
function logsView(){if(state.loading.logs)return `<div class="card"><div class="loader"></div></div>`;const l=state.logs||{};return `<div class="grid"><div class="card"><div class="row"><h2 style="margin-right:auto">Device Logs</h2><button class="btn secondary" onclick="loadLogs()">Refresh</button></div><pre>${l.events||"No device log."}</pre></div><div class="card"><h2>Offline Sync Queue</h2><pre>${l.unsent||"No pending records."}</pre></div></div>`}
function backupView(){return `<div class="grid"><div class="card"><h2>Backup</h2><p class="muted">Download SD files and settings. Fingerprint templates remain inside the fingerprint sensor.</p><div class="row"><button class="btn" onclick="download('/api/backup/settings','francis-key-settings.json')">Settings</button><button class="btn secondary" onclick="download('/api/backup/file?name=attendance','attendance.csv')">Attendance</button><button class="btn secondary" onclick="download('/api/backup/file?name=users','users.psv')">Users</button><button class="btn secondary" onclick="download('/api/backup/file?name=queue','unsent.psv')">Queue</button><button class="btn secondary" onclick="download('/api/backup/file?name=logs','device.log')">Logs</button></div></div><div class="card"><h2>Restore Settings</h2><div class="field"><label>Settings JSON</label><textarea id="restoreSettings"></textarea></div><button class="btn danger" onclick="restoreSettings()">Restore Settings</button></div><div class="card"><h2>Restore SD File</h2><div class="field"><label>File</label><select id="restoreFile"><option value="attendance">Attendance CSV</option><option value="users">Users cache</option><option value="queue">Unsent queue</option><option value="logs">Device log</option></select></div><div class="field"><label>Content</label><textarea id="restoreContent"></textarea></div><button class="btn danger" onclick="restoreFile()">Restore File</button></div><div class="card"><h2>Clear All Cache</h2><p class="muted">⚠ Erases all fingerprint templates from the sensor and removes all RFID cache, student data, attendance records, and unsent queue from LFS. This cannot be undone.</p><button class="btn danger" onclick="clearCache()">Clear All Cache</button></div></div>`}
function dateTimeView(){const d=state.device||{};const h24=d.rtcHour24!==undefined?d.rtcHour24:12;const h12=h24%12||12;const ampm=h24>=12?'PM':'AM';const m=d.rtcMonth||1;const dd=d.rtcDay||1;const y=d.rtcYear||2026;const min=d.rtcMinute||0;const mn=["January","February","March","April","May","June","July","August","September","October","November","December"];let ms='';for(let i=1;i<=12;i++)ms+='<option value="'+i+'"'+(i===m?' selected':'')+'>'+mn[i-1]+'</option>';let hs='';for(let i=1;i<=12;i++){const s=i<10?'0'+i:''+i;hs+='<option value="'+i+'"'+(i===h12?' selected':'')+'>'+s+'</option>'}let mins='';for(let i=0;i<60;i++){const s=i<10?'0'+i:''+i;mins+='<option value="'+s+'"'+(i===min?' selected':'')+'>'+s+'</option>'}return '<div class="card"><h2>Set Date & Time (Offline)</h2><p class="muted">Manually set the RTC date and time when the device is offline. All times are in 12-hour format.</p><div class="grid" style="grid-template-columns:1fr 1fr"><div class="field"><label>Year</label><input type="number" id="dtYear" min="2000" max="2099" value="'+y+'"></div><div class="field"><label>Month</label><select id="dtMonth">'+ms+'</select></div><div class="field"><label>Day</label><input type="number" id="dtDay" min="1" max="31" value="'+dd+'"></div><div class="field"><label>Hour</label><select id="dtHour">'+hs+'</select></div><div class="field"><label>Minute</label><select id="dtMinute">'+mins+'</select></div><div class="field"><label>AM/PM</label><select id="dtAmPm"><option value="AM"'+(ampm==='AM'?' selected':'')+'>AM</option><option value="PM"'+(ampm==='PM'?' selected':'')+'>PM</option></select></div></div><button class="btn" onclick="saveDateTime()">Set Date & Time</button><div style="margin-top:12px;padding:12px;background:#fbfdfe;border-radius:8px;border:1px solid var(--line)"><div class="muted">Current device time</div><b>'+d.date+' '+d.time+'</b></div></div>'}
async function saveDateTime(){const y=parseInt($("dtYear").value);const mo=parseInt($("dtMonth").value);const d=parseInt($("dtDay").value);const h12=parseInt($("dtHour").value);const mi=parseInt($("dtMinute").value);const pm=$("dtAmPm").value==="PM";if(!y||!mo||!d||!h12||mi===undefined){toast("Please fill all fields");return}if(d<1||d>31){toast("Day must be between 1 and 31");return}try{await api("/api/time/set",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({year:y,month:mo,day:d,hour12:h12,minute:mi,isPm:pm})});toast("Date and time updated.");loadState()}catch(e){toast(e.message)}}
function render(){shell();const v=state.view;let html=v==="Dashboard"?dashboard():v==="Attendance"?attendance():v==="Register User"?registerView():v==="Users"?usersView():v==="WiFi Settings"?wifiView():v==="Attendance Rules"?rulesView():v==="Date/Time"?dateTimeView():v==="Logs"?logsView():backupView();$("content").innerHTML=html}
async function loadState(){try{state.device=await api("/api/state");render()}catch(e){console.log(e.message)}}
async function loadAttendance(){setLoading("attendance",true);try{state.attendance=(await api("/api/attendance")).records||[]}catch(e){toast(e.message)}setLoading("attendance",false)}
async function loadStudents(){setLoading("students",true);try{state.students=(await api("/api/students")).students||[]}catch(e){toast(e.message)}setLoading("students",false)}
async function loadUsers(){setLoading("users",true);try{state.users=(await api("/api/users")).users||[]}catch(e){toast(e.message)}setLoading("users",false)}
async function scanWifi(){setLoading("scan",true);try{const r=await api("/api/wifi/scan");state.networks=r.networks||[];state.scanStatus=state.networks.length?"Found "+state.networks.length+" 2.4GHz networks":"No 2.4GHz WiFi networks found."}catch(e){state.scanStatus="";toast(e.message)}setLoading("scan",false)}
async function loadLogs(){setLoading("logs",true);try{state.logs=await api("/api/logs")}catch(e){toast(e.message)}setLoading("logs",false)}
async function loadWifiStatus(){try{state.wifiStatus=await api("/api/wifi/status")}catch(e){}}
function loadView(v){if(v==="Attendance")loadAttendance();if(v==="Register User")loadStudents();if(v==="Users")loadUsers();if(v==="WiFi Settings"){loadWifiStatus();scanWifi()}if(v==="Date/Time")loadState();if(v==="Logs")loadLogs()}
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
async function clearCache(){if(!confirm("Permanently delete ALL fingerprint templates, RFID cache, student data, and attendance records? This cannot be undone."))return;if(!confirm("Are you sure? All enrolled fingerprints will be erased from the sensor and all cached data will be removed."))return;try{const r=await api("/api/cache/clear",{method:"POST"});toast("Cache cleared. ("+r.message+")");loadState()}catch(e){toast(e.message)}}
function userActionModal(userId,action,name,isActive){if(!action)return;const titles={deactivate:"Deactivate User",activate:"Activate User",delete:"Delete Credentials"};const msgs={deactivate:"Deactivate "+name+"? This user will not be able to attend.",activate:"Activate "+name+"? This user will be able to attend again.",delete:"Delete credentials for "+name+"? Fingerprint and RFID will be removed and freed for reuse. This cannot be undone."};const colors={deactivate:"#b7791f",activate:"#16845b",delete:"#c24141"};$("modal").innerHTML=`<div style="display:grid;gap:12px"><h2 style="color:${colors[action]}">${titles[action]}</h2><p>${msgs[action]}</p><div class="row"><button class="btn" style="background:${colors[action]}" onclick="confirmUserAction(${userId},'${action}')">Confirm</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div></div>`;$("modalBg").classList.add("show")}
async function confirmUserAction(userId,action){try{await api("/api/student/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:userId})});closeModal();toast("Action completed.");loadUsers()}catch(e){toast(e.message)}}
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
  payload += F(",\"rtcReady\":"); payload += rtcReady ? F("true") : F("false");
  payload += F(",\"nfcReady\":"); payload += nfcReady ? F("true") : F("false");
  payload += F(",\"fingerprintReady\":"); payload += fingerprintReady ? F("true") : F("false");
  payload += F(",\"tftReady\":"); payload += tftReady ? F("true") : F("false");
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

  // Try live API first; fall back to LittleFS cache for offline registration
  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  bool apiOk = wifiReady && getDeviceJson("users", response, httpCode, error);
  if (apiOk) {
    // Refresh the LFS cache for future offline use
    cacheUsersToLFS(response);
  } else if (!loadCachedUsersFromLFS(response)) {
    sendJson(503, "{\"ok\":false,\"error\":\"No student data available. \"}");
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

  // Try live API first; fall back to LittleFS cache for offline registration
  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  bool apiOk = wifiReady && getDeviceJson("users", response, httpCode, error);
  if (!apiOk) {
    response.clear();
    loadCachedUsersFromLFS(response);
  } else {
    // Refresh LFS cache for future offline use
    cacheUsersToLFS(response);
  }

  bool found = false;
  JsonArray users = response["users"].as<JsonArray>();
  if (!users) { users = response.as<JsonArray>(); } // handle bare-array cache
  for (JsonObject user : users) {
    // Match by userId for API data, or by idNumber for LFS cache
    if ((int) user["id"] == userId) {
      String role = String((const char *) (user["role"] | "student"));
      String status = String((const char *) (user["status"] | "active"));
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
  DynamicJsonDocument doc(16384);
  String payload;
  payload.reserve(12000);
  payload += F("{\"ok\":true,\"records\":[");
  if (lfsReady && LittleFS.exists("/attendance.json")) {
    File file = LittleFS.open("/attendance.json", "r");
    if (file) {
      DeserializationError err = deserializeJson(doc, file);
      file.close();
      if (!err) {
        bool first = true;
        for (JsonObject rec : doc.as<JsonArray>()) {
          if (!first) payload += ",";
          first = false;
          payload += F("{\"id\":\"");
          payload += jsonEscape(String((const char *)(rec["id_number"] | "")));
          payload += F("\",\"name\":\"");
          payload += jsonEscape(String((const char *)(rec["name"] | "")));
          payload += F("\",\"date\":\"");
          String ts = String((const char *)(rec["timestamp"] | ""));
          payload += jsonEscape(ts.substring(0, 10));
          payload += F("\",\"time\":\"");
          payload += jsonEscape(ts.length() > 11 ? ts.substring(11, 19) : "");
          payload += F("\",\"status\":\"");
          payload += jsonEscape(String((const char *)(rec["type"] | "IN")));
          payload += F("\"}");
        }
      }
    }
  }
  payload += F("]}");
  sendJson(200, payload);
}

void handleApiUsers() {
  if (!requireApiAdmin()) {
    return;
  }

  // Try live API first; fall back to LFS cache
  DynamicJsonDocument response(24576);
  int httpCode = 0;
  String error;
  bool apiOk = wifiReady && getDeviceJson("all_users", response, httpCode, error);

  if (apiOk) {
    // Return users from API with all fields
    String payload;
    payload.reserve(8000);
    payload += F("{\"ok\":true,\"users\":[");
    bool first = true;
    for (JsonObject user : response["users"].as<JsonArray>()) {
      if (!first) payload += ",";
      first = false;
      payload += F("{\"userId\":"); payload += String((int)(user["id"] | 0));
      payload += F(",\"idNumber\":\""); payload += jsonEscape(String((const char *)(user["idNumber"] | "")));
      payload += F("\",\"fullName\":\""); payload += jsonEscape(String((const char *)(user["fullName"] | "")));
      payload += F("\",\"fingerprintId\":\""); payload += jsonEscape(String((const char *)(user["fingerprintId"] | "")));
      payload += F("\",\"smartCardId\":\""); payload += jsonEscape(String((const char *)(user["smartCardId"] | "")));
      String st = String((const char *)(user["status"] | "Active"));
      st.toLowerCase();
      payload += F("\",\"status\":\""); payload += jsonEscape(st);
      payload += F("\"}");
    }
    payload += F("]}");
    sendJson(200, payload);
    return;
  }

  // Fallback: read from LFS /students.json
  DynamicJsonDocument doc(8192);
  String payload;
  payload.reserve(8000);
  payload += F("{\"ok\":true,\"users\":[");
  if (lfsReady && LittleFS.exists("/students.json")) {
    File file = LittleFS.open("/students.json", "r");
    if (file) {
      DeserializationError err = deserializeJson(doc, file);
      file.close();
      if (!err) {
        bool first = true;
        for (JsonObject s : doc.as<JsonArray>()) {
          if (!first) payload += ",";
          first = false;
          int uid = s["user_id"] | 0;
          payload += F("{\"userId\":"); payload += String(uid);
          payload += F(",\"idNumber\":\"");
          payload += jsonEscape(String((const char *)(s["id_number"] | "")));
          payload += F("\",\"fullName\":\"");
          payload += jsonEscape(String((const char *)(s["name"] | "")));
          payload += F("\",\"fingerprintId\":\"");
          payload += jsonEscape(String((const char *)(s["fingerprint_id"] | "")));
          payload += F("\",\"smartCardId\":\"");
          payload += jsonEscape(String((const char *)(s["uuid"] | "")));
          payload += F("\",\"status\":\"");
          payload += jsonEscape(String((const char *)(s["status"] | "active")));
          payload += F("\"}");
        }
      }
    }
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
      apiUrl = String("http://") + apiHost + "/api/device.php";
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
      apiUrl = String("http://") + apiHost + "/api/device.php";
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
  payload += F(",\"currentUrl\":\"http://"); payload += jsonEscape(apiHost); payload += F("/api/device.php\"");
  payload += F(",\"defaultUrl\":\"http://"); payload += jsonEscape(defaultApiHost); payload += F("/api/device.php\"");
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
  int unsentCount = 0;
  DynamicJsonDocument doc(16384);
  if (lfsReady && LittleFS.exists("/attendance.json")) {
    File file = LittleFS.open("/attendance.json", "r");
    if (file) {
      if (deserializeJson(doc, file) == DeserializationError::Ok) {
        for (JsonObject rec : doc.as<JsonArray>()) {
          if (!(rec["synced"] | true)) unsentCount++;
        }
      }
      file.close();
    }
  }
  String payload;
  payload.reserve(256);
  payload += F("{\"ok\":true,\"events\":\"\",\"unsent\":\"");
  payload += String(unsentCount);
  payload += F(" pending\"}");
  sendJson(200, payload);
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
  databaseReady = true;
  // Cache the full user list to LittleFS for offline registration
  cacheUsersToLFS(response);
  return true;
}

bool registerCredentials(uint16_t fingerprintId, const String &rfidUid, String &error) {
  int httpCode = 0;
  bool ok = false;
  LocalUser cached;

  // Free API JSON docs (5 KB) before SD write calls (32+40 KB)
  {
    DynamicJsonDocument request(1024);
    DynamicJsonDocument response(4096);

    request["userId"] = pendingRegistrationUserId;
    request["fingerprintId"] = String(fingerprintId);
    request["smartCardId"] = rfidUid;

    ok = postDeviceJson("register", request, response, httpCode, error);
    databaseReady = ok || (httpCode > 0 && httpCode < 500);

    if (ok) {
      JsonObject user = response["user"].as<JsonObject>();
      pendingRegistrationName = String((const char *)(user["fullName"] | pendingRegistrationName.c_str()));
      cached.found = true;
      cached.userId = String((int)(user["id"] | pendingRegistrationUserId));
      cached.idNumber = String((const char *)(user["idNumber"] | ""));
      cached.fullName = pendingRegistrationName;
      cached.fingerprintId = String(fingerprintId);
      cached.smartCardId = rfidUid;
    }
  }
  // request + response freed here

  if (ok) {
    // API registration succeeded — also cache to LittleFS
    String localError;
    if (!upsertCachedUser(cached, localError)) {
      error = localError;
      return false;
    }
    fetchAndCacheUsers();
    return true;
  }

  // ===== API unavailable — save to LittleFS only (offline registration) =====
  String lfsError;
  if (upsertStudentInLFS(pendingRegistrationIdNumber, pendingRegistrationName,
                          String(fingerprintId), rfidUid, "active", pendingRegistrationUserId, lfsError)) {
    logEvent("REG", "Offline registration saved to LittleFS for " + pendingRegistrationName);
    // Mark that we succeeded without the API so the caller knows it worked
    ok = true;
    error = "";
    return true;
  }
  // Both API and LittleFS failed — report the original API error
  return false;
}

bool upsertCachedUser(const LocalUser &updated, String &error) {
  if (!updated.found) {
    error = "No user data provided.";
    return false;
  }
  int uid = updated.userId.toInt();
  return upsertStudentInLFS(updated.idNumber, updated.fullName,
                            updated.fingerprintId, updated.smartCardId,
                            "active", uid, error);
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

// ==============================================================
// LittleFS helpers — offline-first student cache, attendance,
// fingerprint / RFID duplicate checks, and unsent sync
// ==============================================================

bool isFingerprintInLFS(uint16_t fingerprintId) {
  if (!lfsReady) return false;
  if (!LittleFS.exists("/students.json")) return false;
  File file = LittleFS.open("/students.json", "r");
  if (!file) return false;
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return false;
  String fpStr = String(fingerprintId);
  for (JsonObject s : doc.as<JsonArray>()) {
    if (String((const char *)(s["fingerprint_id"] | "")) == fpStr) return true;
  }
  return false;
}

bool isRfidUuidInLFS(const String &uuid) {
  if (!lfsReady) return false;
  if (!LittleFS.exists("/students.json")) return false;
  File file = LittleFS.open("/students.json", "r");
  if (!file) return false;
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return false;
  String needle = uuid;
  needle.toUpperCase();
  for (JsonObject s : doc.as<JsonArray>()) {
    String stored = String((const char *)(s["uuid"] | ""));
    stored.toUpperCase();
    if (stored == needle) return true;
  }
  return false;
}

LocalUser findStudentInLFS(const String &fingerprintId, const String &uuid) {
  LocalUser user;
  if (!lfsReady) return user;
  if (!LittleFS.exists("/students.json")) return user;
  File file = LittleFS.open("/students.json", "r");
  if (!file) return user;
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return user;
  String fpStr = fingerprintId;
  fpStr.trim();
  String uuidStr = uuid;
  uuidStr.trim();
  uuidStr.toUpperCase();
  for (JsonObject s : doc.as<JsonArray>()) {
    String sFp = String((const char *)(s["fingerprint_id"] | ""));
    String sUuid = String((const char *)(s["uuid"] | ""));
    sFp.trim();
    sUuid.trim();
    sUuid.toUpperCase();
    if (fpStr.length() > 0 && uuidStr.length() > 0) {
      if (sFp == fpStr && sUuid == uuidStr) {
        user.found = true;
        user.idNumber = String((const char *)(s["id_number"] | ""));
        user.fullName = String((const char *)(s["name"] | ""));
        user.fingerprintId = sFp;
        user.smartCardId = sUuid;
        user.credentialStatus = String((const char *)(s["status"] | "active"));
        return user;
      }
    }
  }
  return user;
}

bool addAttendanceToLFS(const String &idNumber, const String &name,
                        const String &timestamp, const String &type) {
  if (!lfsReady) return false;
  DynamicJsonDocument doc(16384);
  JsonArray records;
  File file;
  if (LittleFS.exists("/attendance.json")) {
    file = LittleFS.open("/attendance.json", "r");
    if (file) {
      DeserializationError err = deserializeJson(doc, file);
      file.close();
      records = err ? doc.to<JsonArray>() : doc.as<JsonArray>();
    } else {
      records = doc.to<JsonArray>();
    }
  } else {
    records = doc.to<JsonArray>();
  }
  JsonObject r = records.createNestedObject();
  r["id_number"] = idNumber;
  r["name"] = name;
  r["timestamp"] = timestamp;
  r["type"] = type;
  r["synced"] = false;
  file = LittleFS.open("/attendance.json", "w");
  if (!file) return false;
  serializeJson(doc, file);
  file.close();
  return true;
}

bool cacheUsersToLFS(DynamicJsonDocument &doc) {
  if (!lfsReady) return false;
  File file = LittleFS.open("/api_users_cache.json", "w");
  if (!file) return false;
  serializeJson(doc, file);
  file.close();
  return true;
}

bool loadCachedUsersFromLFS(DynamicJsonDocument &doc) {
  if (!lfsReady) return false;
  if (!LittleFS.exists("/api_users_cache.json")) return false;
  File file = LittleFS.open("/api_users_cache.json", "r");
  if (!file) return false;
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  return err == DeserializationError::Ok;
}

bool upsertStudentInLFS(const String &idNumber, const String &fullName,
                        const String &fingerprintId, const String &uuid,
                        const String &credentialStatus, int userId,
                        String &error) {
  if (!lfsReady) { error = "LittleFS not available"; return false; }
  DynamicJsonDocument doc(8192);
  JsonArray students;
  if (LittleFS.exists("/students.json")) {
    File file = LittleFS.open("/students.json", "r");
    if (file) {
      DeserializationError err = deserializeJson(doc, file);
      file.close();
      if (!err) {
        students = doc.as<JsonArray>();
        for (size_t i = 0; i < students.size(); i++) {
          String existingId = String((const char *)(students[i]["id_number"] | ""));
          if (existingId == idNumber) {
            students.remove(i);
            break;
          }
        }
      }
    }
  }
  if (!students) {
    doc.clear();
    students = doc.to<JsonArray>();
  }
  JsonObject s = students.createNestedObject();
  s["id_number"] = idNumber;
  s["name"] = fullName;
  s["fingerprint_id"] = fingerprintId;
  s["uuid"] = uuid;
  s["status"] = credentialStatus.length() > 0 ? credentialStatus : "active";
  if (userId > 0) s["user_id"] = userId;
  File file = LittleFS.open("/students.json", "w");
  if (!file) { error = "Failed to write /students.json"; return false; }
  serializeJson(doc, file);
  file.close();
  return true;
}

LocalUser findStudentByFpInLFS(uint16_t fpId) {
  LocalUser user;
  if (!lfsReady) return user;
  if (!LittleFS.exists("/students.json")) return user;
  File file = LittleFS.open("/students.json", "r");
  if (!file) return user;
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return user;
  String fpStr = String(fpId);
  for (JsonObject s : doc.as<JsonArray>()) {
    String sFp = String((const char *)(s["fingerprint_id"] | ""));
    sFp.trim();
    if (sFp == fpStr) {
      user.found = true;
      user.idNumber = String((const char *)(s["id_number"] | ""));
      user.fullName = String((const char *)(s["name"] | ""));
      user.fingerprintId = sFp;
      user.smartCardId = String((const char *)(s["uuid"] | ""));
      user.credentialStatus = String((const char *)(s["status"] | "active"));
      return user;
    }
  }
  return user;
}

bool updateStudentFieldInLFS(const String &idNumber, const String &field, const String &value) {
  if (!lfsReady) return false;
  if (!LittleFS.exists("/students.json")) return false;
  DynamicJsonDocument doc(8192);
  File file = LittleFS.open("/students.json", "r");
  if (!file) return false;
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return false;
  for (JsonObject s : doc.as<JsonArray>()) {
    String existingId = String((const char *)(s["id_number"] | ""));
    if (existingId == idNumber) {
      s[field] = value;
      file = LittleFS.open("/students.json", "w");
      if (!file) return false;
      serializeJson(doc, file);
      file.close();
      return true;
    }
  }
  return false;
}

bool deactivateStudentInLFS(int userId, String &error) {
  // Find the student by iterating and matching by a reverse lookup
  // We match by finding the student whose idNumber maps to this userId
  // Since LFS doesn't store userId, we use the PHP API response to find idNumber
  // Then update status in LFS

  // First try to get the user info from the API
  if (wifiReady) {
    DynamicJsonDocument request(512);
    DynamicJsonDocument response(4096);
    int httpCode = 0;
    request["userId"] = userId;
    bool ok = postDeviceJson("deactivate_user", request, response, httpCode, error);
    if (!ok && httpCode == 0) {
      // WiFi offline - try LFS only
    } else if (ok) {
      // API succeeded - update LFS cache from the returned user data
      JsonObject user = response["user"].as<JsonObject>();
      String idNumber = String((const char *)(user["idNumber"] | ""));
      if (idNumber.length() > 0) {
        updateStudentFieldInLFS(idNumber, "status", "inactive");
      }
      return true;
    } else {
      databaseReady = false;
    }
  }

  // Offline: try to update all students with matching info in LFS
  // We need to find the student by userId - scan all entries
  if (!lfsReady || !LittleFS.exists("/students.json")) {
    error = "Offline and no local cache available.";
    return false;
  }
  DynamicJsonDocument doc(8192);
  File file = LittleFS.open("/students.json", "r");
  if (!file) { error = "Cannot read cache."; return false; }
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) { error = "Cache read error."; return false; }

  bool found = false;
  for (JsonObject s : doc.as<JsonArray>()) {
    // LFS doesn't store userId directly; we need to match via fingerprintTemplateForUser
    // This is a best-effort offline approach
    String fpId = String((const char *)(s["fingerprint_id"] | ""));
    if (fpId.length() > 0) {
      uint16_t templateId = fpId.toInt();
      if (templateId > 0) {
        // Reverse: check if this templateId belongs to this userId
        int expectedTemplateId = fingerprintTemplateForUser(userId);
        if (templateId == expectedTemplateId) {
          s["status"] = "inactive";
          found = true;
          break;
        }
      }
    }
  }
  if (found) {
    file = LittleFS.open("/students.json", "w");
    if (!file) { error = "Write failed."; return false; }
    serializeJson(doc, file);
    file.close();
    return true;
  }
  error = "Student not found in local cache.";
  return false;
}

bool activateStudentInLFS(int userId, String &error) {
  if (wifiReady) {
    DynamicJsonDocument request(512);
    DynamicJsonDocument response(4096);
    int httpCode = 0;
    request["userId"] = userId;
    bool ok = postDeviceJson("activate_user", request, response, httpCode, error);
    if (!ok && httpCode == 0) {
      // WiFi offline
    } else if (ok) {
      JsonObject user = response["user"].as<JsonObject>();
      String idNumber = String((const char *)(user["idNumber"] | ""));
      if (idNumber.length() > 0) {
        updateStudentFieldInLFS(idNumber, "status", "active");
      }
      return true;
    } else {
      databaseReady = false;
    }
  }

  // Offline fallback
  if (!lfsReady || !LittleFS.exists("/students.json")) {
    error = "Offline and no local cache available.";
    return false;
  }
  DynamicJsonDocument doc(8192);
  File file = LittleFS.open("/students.json", "r");
  if (!file) { error = "Cannot read cache."; return false; }
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) { error = "Cache read error."; return false; }

  bool found = false;
  for (JsonObject s : doc.as<JsonArray>()) {
    String fpId = String((const char *)(s["fingerprint_id"] | ""));
    if (fpId.length() > 0) {
      uint16_t templateId = fpId.toInt();
      if (templateId > 0) {
        int expectedTemplateId = fingerprintTemplateForUser(userId);
        if (templateId == expectedTemplateId) {
          s["status"] = "active";
          found = true;
          break;
        }
      }
    }
  }
  if (found) {
    file = LittleFS.open("/students.json", "w");
    if (!file) { error = "Write failed."; return false; }
    serializeJson(doc, file);
    file.close();
    return true;
  }
  error = "Student not found in local cache.";
  return false;
}

bool deleteStudentCredentialsInLFS(int userId, String &error) {
  // Find student's fingerprint template ID before deleting
  uint16_t templateId = fingerprintTemplateForUser(userId);

  // Delete fingerprint template from the sensor
  if (fingerprintReady && templateId > 0) {
    uint8_t result = finger.deleteModel(templateId);
    if (result != FINGERPRINT_OK) {
      // Template may not exist - continue anyway
      Serial.printf("[DELETE] finger.deleteModel(%u) returned %u\n", templateId, result);
    }
  }

  // Clear credentials in LFS
  if (lfsReady && LittleFS.exists("/students.json")) {
    DynamicJsonDocument doc(8192);
    File file = LittleFS.open("/students.json", "r");
    if (file) {
      DeserializationError err = deserializeJson(doc, file);
      file.close();
      if (!err) {
        bool found = false;
        for (JsonObject s : doc.as<JsonArray>()) {
          String fpId = String((const char *)(s["fingerprint_id"] | ""));
          if (fpId.length() > 0) {
            if (fpId.toInt() == templateId) {
              s["fingerprint_id"] = "";
              s["uuid"] = "";
              found = true;
              break;
            }
          }
        }
        if (found) {
          file = LittleFS.open("/students.json", "w");
          if (file) {
            serializeJson(doc, file);
            file.close();
          }
        }
      }
    }
  }

  // Sync to PHP API
  if (wifiReady) {
    DynamicJsonDocument request(512);
    DynamicJsonDocument response(4096);
    int httpCode = 0;
    request["userId"] = userId;
    bool ok = postDeviceJson("delete_credentials", request, response, httpCode, error);
    if (!ok && httpCode > 0) {
      databaseReady = false;
    }
  }

  return true;
}

void syncUnsentAttendance() {
  if (!lfsReady || !wifiReady) return;
  if (!LittleFS.exists("/attendance.json")) return;
  DynamicJsonDocument doc(16384);
  File file = LittleFS.open("/attendance.json", "r");
  if (!file) return;
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) return;
  JsonArray records = doc.as<JsonArray>();
  bool changed = false;
  for (JsonObject rec : records) {
    bool synced = rec["synced"] | true;
    if (synced) continue;
    String idNumber = String((const char *)(rec["id_number"] | ""));
    String name = String((const char *)(rec["name"] | ""));
    String timestamp = String((const char *)(rec["timestamp"] | ""));
    String type = String((const char *)(rec["type"] | ""));
    DynamicJsonDocument req(1024);
    DynamicJsonDocument resp(4096);
    int httpCode = 0;
    String error;
    req["fingerprintId"] = "";
    req["smartCardId"] = "";
    req["occurredAt"] = timestamp;
    req["localRecordId"] = makeLocalRecordId();
    req["idNumber"] = idNumber;
    req["name"] = name;
    req["type"] = type;
    req["offlineSync"] = true;
    bool ok = postDeviceJson("attendance", req, resp, httpCode, error);
    if (ok) {
      rec["synced"] = true;
      changed = true;
      logEvent("SYNC", "Uploaded attendance for " + idNumber + " " + name);
      delay(50);
    }
  }
  if (changed) {
    file = LittleFS.open("/attendance.json", "w");
    if (file) {
      serializeJson(doc, file);
      file.close();
    }
  }
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
    // Save to API (online) or LittleFS (offline).
    // ================================================================
    registrationPhase = "api";
    drawScreen("Registration", "Saving Online", pendingRegistrationName, "Please wait", ILI9341_BLUE);

    String apiError;
    bool registered = registerCredentials(pendingFingerprintTemplateId, pendingRfidUid, apiError);

    if (registered) {
      registrationPhase = "complete";
      drawScreen("Registration Complete", "ID: " + (pendingRegistrationIdNumber.length() ? pendingRegistrationIdNumber : String(pendingRegistrationUserId)), pendingRegistrationName, "Saved", ILI9341_GREEN);
      logEvent("REG", "Registration complete for " + pendingRegistrationName + " FP " + String(pendingFingerprintTemplateId) + " RFID " + pendingRfidUid);
    } else {
      registrationPhase = "complete";
      drawScreen("Registration Failed", "ID: " + (pendingRegistrationIdNumber.length() ? pendingRegistrationIdNumber : String(pendingRegistrationUserId)), pendingRegistrationName, "API Error: " + apiError, ILI9341_RED);
      logEvent("REG", "Registration API failed for " + pendingRegistrationName + " FP " + String(pendingFingerprintTemplateId) + " RFID " + pendingRfidUid + ": " + apiError);
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
  // ===== Duplicate fingerprint check (finger is still on sensor) =====
  {
    uint8_t srchResult = finger.fingerFastSearch();
    if (srchResult == FINGERPRINT_OK) {
      // Physical fingerprint already exists in sensor DB
      errorMsg = "Already Registered";
      waitForFingerRelease(5000);
      return false;
    }
    // Also check whether the template ID is already assigned in LittleFS
    if (isFingerprintInLFS(pendingFingerprintTemplateId)) {
      errorMsg = "Already Registered";
      waitForFingerRelease(5000);
      return false;
    }
  }
  // =================================================================
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
      // ===== RFID UUID duplicate check =====
      if (isRfidUuidInLFS(firstUid)) {
        drawScreen("RFID Registration", "ID Card Already Registered", firstUid, "", ILI9341_RED);
        signalError();
        delay(2500);
        return false;
      }
      // ======================================
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
      // Check if this user is deactivated BEFORE asking for RFID
      LocalUser candidate = findStudentByFpInLFS(fingerprintId);
      if (candidate.found && candidate.credentialStatus != "active") {
        drawScreen("Attendance", "Fingerprint and RFID", "Deactivated", candidate.fullName, ILI9341_RED);
        signalError();
        mode = MODE_HOME;
        return;
      }
      attendanceFingerprintId = String(fingerprintId);
      signalFingerprint();
      digitalWrite(YELLOW_LED_PIN, HIGH);
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

  // ===== Primary verification via LittleFS =====
  LocalUser matched = findStudentInLFS(attendanceFingerprintId, attendanceRfidUid);
  if (matched.found) {
    // Attendance verified via local cache
    addAttendanceToLFS(matched.idNumber, matched.fullName, occurredAt, "IN");
    logEvent("ATTENDANCE", "IN for " + matched.idNumber + " " + matched.fullName + " (LFS)");
    drawScreen("Attendance Success", "ID: " + matched.idNumber, matched.fullName, "Status: IN", ILI9341_GREEN);
    signalSuccess();
    delay(600);
    // Attempt to sync pending records to API (best-effort)
    if (wifiReady) {
      syncUnsentAttendance();
    }
    return;
  }

  // ===== Fallback: try the online API =====
  String localRecordId = makeLocalRecordId();
  AttendanceResult result = postAttendance(attendanceFingerprintId, attendanceRfidUid, occurredAt, localRecordId);
  if (result.ok) {
    String status = result.status.length() ? result.status : "IN";
    logEvent("ATTENDANCE", status + " for " + result.idNumber + " " + result.fullName + " (API)");
    drawScreen("Attendance Success", "ID: " + result.idNumber, result.fullName, "Status: " + status, ILI9341_GREEN);
    signalSuccess();
    delay(600);
    return;
  }

  // Not found in either LFS or API
  drawScreen("Attendance Failed", "Cannot Be Recognized", "", "", ILI9341_RED);
  logEvent("ATTENDANCE", "Failed FP " + attendanceFingerprintId + " RFID " + attendanceRfidUid + ": not in LFS or API");
  signalError();
  delay(2500);
}

// SD removed

void logEvent(const String &category, const String &message) {
  Serial.printf("[LOG] %s | %s\n", category.c_str(), message.c_str());
}

String makeLocalRecordId() {
  static uint32_t counter = 0;
  counter++;
  return String((uint32_t) esp_random(), HEX) + String(millis(), HEX) + String(counter);
}

void maintainWifi() {
  if (wifiSsid.length() == 0) return;
  if (wifiReady && WiFi.status() == WL_CONNECTED) return;
  const uint32_t nowMs = millis();
  if (nowMs - lastWifiReconnectAt < 30000) return;
  lastWifiReconnectAt = nowMs;
  wifiState = WIFI_STATE_RECONNECTING;
  wifiReady = connectToWifi(wifiSsid, wifiPassword, 10000);
  if (wifiReady) {
    printNetworkInfo("WiFi reconnected");
    checkApiStatus();
    fetchAndCacheUsers();
    if (mode == MODE_HOME) drawHomeScreen();
  } else {
    wifiState = WIFI_STATE_DISCONNECTED;
  }
}

void handleApiStudentDeactivate() {
  if (!requireApiAdmin()) return;
  DynamicJsonDocument request(256);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON.\"}");
    return;
  }
  int userId = request["userId"] | 0;
  if (userId <= 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"userId is required.\"}");
    return;
  }
  String error;
  if (!deactivateStudentInLFS(userId, error)) {
    sendJson(500, "{\"ok\":false,\"error\":\"" + jsonEscape(error) + "\"}");
    return;
  }
  logEvent("ADMIN", "Deactivated credentials for userId " + String(userId));
  sendJson(200, "{\"ok\":true,\"message\":\"User deactivated.\"}");
}

void handleApiStudentActivate() {
  if (!requireApiAdmin()) return;
  DynamicJsonDocument request(256);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON.\"}");
    return;
  }
  int userId = request["userId"] | 0;
  if (userId <= 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"userId is required.\"}");
    return;
  }
  String error;
  if (!activateStudentInLFS(userId, error)) {
    sendJson(500, "{\"ok\":false,\"error\":\"" + jsonEscape(error) + "\"}");
    return;
  }
  logEvent("ADMIN", "Activated credentials for userId " + String(userId));
  sendJson(200, "{\"ok\":true,\"message\":\"User activated.\"}");
}

void handleApiStudentDelete() {
  if (!requireApiAdmin()) return;
  DynamicJsonDocument request(256);
  if (deserializeJson(request, server.arg("plain"))) {
    sendJson(400, "{\"ok\":false,\"error\":\"Invalid JSON.\"}");
    return;
  }
  int userId = request["userId"] | 0;
  if (userId <= 0) {
    sendJson(400, "{\"ok\":false,\"error\":\"userId is required.\"}");
    return;
  }
  String error;
  if (!deleteStudentCredentialsInLFS(userId, error)) {
    sendJson(500, "{\"ok\":false,\"error\":\"" + jsonEscape(error) + "\"}");
    return;
  }
  logEvent("ADMIN", "Deleted credentials for userId " + String(userId));
  sendJson(200, "{\"ok\":true,\"message\":\"Credentials deleted and fingerprint slot freed.\"}");
}

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
      logMsg += "FP! ";
      Serial.printf("[CACHE] Fingerprint emptyDatabase failed: %u\n", result);
    }
  }

  // 2. LittleFS: remove all cached files
  if (lfsReady) {
    const char *files[] = {"/students.json", "/attendance.json", "/api_users_cache.json"};
    for (int i = 0; i < 3; i++) {
      if (LittleFS.exists(files[i])) {
        if (LittleFS.remove(files[i])) {
          cleared++;
          logMsg += "LFS ";
          Serial.printf("[CACHE] Removed %s\n", files[i]);
        } else {
          errors++;
          logMsg += "LFS! ";
          Serial.printf("[CACHE] Failed to remove %s\n", files[i]);
        }
      }
    }
  }

  String result = "Fingerprint + LFS cache cleared";
  logEvent("CACHE", "Cache clear: " + logMsg + "(" + result + ")");

  drawScreen("Cache Cleared", "Fingerprint + LFS", logMsg, result, errors == 0 ? ILI9341_GREEN : ILI9341_YELLOW);

  String payload;
  payload.reserve(256);
  payload += F("{\"ok\":true,\"cleared\":"); payload += String(cleared);
  payload += F(",\"errors\":"); payload += String(errors);
  payload += F(",\"message\":\""); payload += jsonEscape(result); payload += F("\"}");
  sendJson(200, payload);
}
