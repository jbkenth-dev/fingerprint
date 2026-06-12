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

enum DeviceMode {
  MODE_INSTALL_PORTAL,
  MODE_HOME,
  MODE_REGISTER_FINGERPRINT,
  MODE_REGISTER_RFID,
  MODE_WAIT_RFID_ATTENDANCE
};

struct LocalUser {
  bool found = false;
  String userId;
  String idNumber;
  String fullName;
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

bool wifiReady = false;
bool databaseReady = false;
bool sdReady = false;
bool rtcReady = false;
bool nfcReady = false;
bool fingerprintReady = false;
bool tftReady = false;

int pendingRegistrationUserId = 0;
String pendingRegistrationName;
uint16_t pendingFingerprintTemplateId = 0;
String pendingRfidUid;

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

void initPins();
void loadSettings();
void saveSettings();
void initDisplay();
void initBusesAndDevices();
void startInstallPortal();
void setupPortalRoutes();
void setupDeviceRoutes();
void connectToSavedWifi();
bool connectToWifi(const String &ssid, const String &password, uint32_t timeoutMs);
void syncClock();
DateTime currentDateTime();
String formatDate(const DateTime &dt);
String formatTime12(const DateTime &dt);
String formatDay(const DateTime &dt);
String isoNow();
void drawScreen(const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent);
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
String htmlEscape(String value);
bool requireAdmin();
void redirectToRoot();
void handlePortalRoot();
void handlePortalConnect();
void handleStatusPage();
void handleRegisterPage();
void handleRegisterPost();
void handleAttendancePage();
void handleLogsPage();
void handleSettingsPage();
void handleSettingsPost();
void handleWifiResetPost();
String buildUserOptions();
bool getDeviceJson(const String &action, DynamicJsonDocument &response, int &httpCode, String &error);
bool postDeviceJson(const String &action, DynamicJsonDocument &request, DynamicJsonDocument &response, int &httpCode, String &error);
String endpointFor(const String &action);
bool checkApiStatus();
bool fetchAndCacheUsers();
bool registerCredentials(uint16_t fingerprintId, const String &rfidUid, String &error);
AttendanceResult postAttendance(const String &fingerprintId, const String &rfidUid, const String &occurredAt, const String &localRecordId);
void runRegistrationWorkflow();
bool enrollFingerprint(uint16_t templateId);
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
String csvEscape(String value);
void appendAttendanceCsv(const String &date, const String &time, const String &id, const String &name, const String &status);
void queueOfflineAttendance(const String &localRecordId, const String &occurredAt, const String &fingerprintId, const String &rfidUid);
void syncOfflineRecords();
LocalUser findCachedUserByCredentials(const String &fingerprintId, const String &rfidUid);
String localNextStatus(const String &date, const String &id);
String fieldAt(const String &line, char separator, int index);
String makeLocalRecordId();
void maintainWifi();

void setup() {
  Serial.begin(115200);
  delay(300);

  initPins();
  loadSettings();
  initDisplay();
  initBusesAndDevices();
  ensureSdFiles();

  if (wifiSsid.length() == 0) {
    mode = MODE_INSTALL_PORTAL;
    drawInstallScreen();
    startInstallPortal();
    return;
  }

  connectToSavedWifi();
  if (!wifiReady) {
    drawScreen("WiFi Failure", "Connection Failed", "Please Try Again", INSTALL_AP_SSID, ILI9341_RED);
    signalError();
    mode = MODE_INSTALL_PORTAL;
    startInstallPortal();
    return;
  }

  syncClock();
  setupDeviceRoutes();
  checkApiStatus();
  fetchAndCacheUsers();
  mode = MODE_HOME;
  drawHomeScreen();
}

void loop() {
  server.handleClient();

  if (mode == MODE_INSTALL_PORTAL) {
    dnsServer.processNextRequest();
    return;
  }

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
  apiUrl = prefs.getString("apiUrl", DEFAULT_API_URL);
  apiKey = prefs.getString("apiKey", DEFAULT_API_KEY);
  deviceId = prefs.getString("devId", DEFAULT_DEVICE_ID);
  adminUser = prefs.getString("adminUser", DEFAULT_ADMIN_USER);
  adminPassword = prefs.getString("adminPass", DEFAULT_ADMIN_PASSWORD);
}

void saveSettings() {
  prefs.putString("apiUrl", apiUrl);
  prefs.putString("apiKey", apiKey);
  prefs.putString("devId", deviceId);
  prefs.putString("adminUser", adminUser);
  prefs.putString("adminPass", adminPassword);
}

void initDisplay() {
  SPI.begin(SPI_SCLK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN);
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tftReady = true;
  drawScreen("FRANCIS KEY", "Starting Device", "Please wait", "", ILI9341_CYAN);
}

void initBusesAndDevices() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  sdReady = SD.begin(SD_CS_PIN, SPI);

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
}

void startInstallPortal() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(INSTALL_AP_SSID, INSTALL_AP_PASSWORD);
  delay(250);

  Serial.println();
  Serial.println(F("Install portal started"));
  Serial.print(F("Connect to WiFi SSID: "));
  Serial.println(INSTALL_AP_SSID);
  Serial.print(F("Portal URL: http://"));
  Serial.println(WiFi.softAPIP());

  dnsServer.start(53, "*", WiFi.softAPIP());
  setupPortalRoutes();
  server.begin();
}

void setupPortalRoutes() {
  server.on("/", HTTP_GET, handlePortalRoot);
  server.on("/connect", HTTP_POST, handlePortalConnect);
  server.on("/generate_204", HTTP_GET, redirectToRoot);
  server.on("/fwlink", HTTP_GET, redirectToRoot);
  server.on("/hotspot-detect.html", HTTP_GET, redirectToRoot);
  server.onNotFound(redirectToRoot);
}

void setupDeviceRoutes() {
  server.on("/", HTTP_GET, handleStatusPage);
  server.on("/admin", HTTP_GET, handleStatusPage);
  server.on("/register", HTTP_GET, handleRegisterPage);
  server.on("/register", HTTP_POST, handleRegisterPost);
  server.on("/attendance", HTTP_GET, handleAttendancePage);
  server.on("/logs", HTTP_GET, handleLogsPage);
  server.on("/settings", HTTP_GET, handleSettingsPage);
  server.on("/settings", HTTP_POST, handleSettingsPost);
  server.on("/reset-wifi", HTTP_POST, handleWifiResetPost);
  server.onNotFound(handleStatusPage);
  server.begin();
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
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < timeoutMs) {
    delay(250);
  }
  const bool connected = WiFi.status() == WL_CONNECTED;
  if (connected) {
    printNetworkInfo("WiFi connected");
  }
  return connected;
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

void drawScreen(const String &title, const String &line1, const String &line2, const String &line3, uint16_t accent) {
  if (!tftReady) {
    return;
  }

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
  homeScreenVisible = false;
  tft.fillScreen(ILI9341_BLACK);
  drawCentered(42, "Device is not installed", ILI9341_RED, 2);
  drawCentered(82, "Please install before use", ILI9341_WHITE, 2);
  drawCentered(130, "Open WiFi and connect to:", ILI9341_LIGHTGREY, 2);
  drawCentered(170, INSTALL_AP_SSID, ILI9341_YELLOW, 3);
  drawCentered(214, "Password: 12345678", ILI9341_LIGHTGREY, 2);
}

void drawHomeScreen() {
  homeScreenVisible = true;
  lastHomeDateText = "";
  lastHomeTimeText = "";
  lastHomeDayText = "";
  lastHomeIpText = "";

  tft.fillScreen(ILI9341_BLACK);

  updateHomeClock(true);

  tft.drawRoundRect(18, 136, 284, 58, 8, ILI9341_DARKGREY);
  drawCentered(154, "Waiting for Attendance", ILI9341_GREEN, 2);

  drawHomeNetworkLine(true);
  drawStatusFooter();
}

void updateHomeClock(bool force) {
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
  String ipText = wifiReady ? WiFi.localIP().toString() : "WiFi offline";
  String line = "IP: " + ipText;

  if (!force && line == lastHomeIpText) {
    return;
  }

  tft.fillRect(0, 198, 320, 16, ILI9341_BLACK);
  drawCentered(202, line, wifiReady ? ILI9341_LIGHTGREY : ILI9341_RED, 1);
  lastHomeIpText = line;
}

void drawStatusFooter() {
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
  Serial.print(F("ESP32 IP: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("Registration URL: http://"));
  Serial.print(WiFi.localIP());
  Serial.println(F("/register"));
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

bool requireAdmin() {
  if (server.authenticate(adminUser.c_str(), adminPassword.c_str())) {
    return true;
  }

  server.requestAuthentication(BASIC_AUTH, "Francis Key Device");
  return false;
}

void redirectToRoot() {
  server.sendHeader("Location", "/", true);
  server.send(302, "text/plain", "");
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
  body += F("<p>The TFT will request 5 fingerprint scans, then 3 RFID scans.</p></div>");
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

  if (sdReady && SD.exists(ATTENDANCE_FILE)) {
    File file = SD.open(ATTENDANCE_FILE, FILE_READ);
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
    if (file) {
      file.close();
    }
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
  if (sdReady && SD.exists(UNSENT_FILE)) {
    File file = SD.open(UNSENT_FILE, FILE_READ);
    while (file && file.available()) {
      body += htmlEscape(file.readStringUntil('\n'));
      body += "\n";
    }
    if (file) {
      file.close();
    }
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
    SD.remove(USER_CACHE_FILE);
    File cache = SD.open(USER_CACHE_FILE, FILE_WRITE);
    for (JsonObject user : users) {
      String userId = String((int) user["id"]);
      String idNumber = String((const char *) (user["idNumber"] | ""));
      String fullName = String((const char *) (user["fullName"] | ""));
      String fingerprintId = String((const char *) (user["fingerprintId"] | ""));
      String smartCardId = String((const char *) (user["smartCardId"] | ""));

      if (cache) {
        cache.print(userId);
        cache.print('|');
        cache.print(idNumber);
        cache.print('|');
        cache.print(fullName);
        cache.print('|');
        cache.print(fingerprintId);
        cache.print('|');
        cache.println(smartCardId);
      }

      options += F("<option value='");
      options += htmlEscape(userId);
      options += F("'>");
      options += htmlEscape(idNumber + " - " + fullName);
      options += "</option>";
    }
    if (cache) {
      cache.close();
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

  SD.remove(USER_CACHE_FILE);
  File cache = SD.open(USER_CACHE_FILE, FILE_WRITE);
  if (!cache) {
    return false;
  }

  JsonArray users = response["users"].as<JsonArray>();
  for (JsonObject user : users) {
    cache.print(String((int) user["id"]));
    cache.print('|');
    cache.print(String((const char *) (user["idNumber"] | "")));
    cache.print('|');
    cache.print(String((const char *) (user["fullName"] | "")));
    cache.print('|');
    cache.print(String((const char *) (user["fingerprintId"] | "")));
    cache.print('|');
    cache.println(String((const char *) (user["smartCardId"] | "")));
  }
  cache.close();
  return true;
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
    fetchAndCacheUsers();
  }
  return ok;
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
    if (!fingerprintReady) {
      drawScreen("Registration", "Fingerprint Sensor", "Not Ready", "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    bool enrolled = enrollFingerprint(pendingFingerprintTemplateId);
    if (!enrolled) {
      drawScreen("Registration", "Fingerprint Mismatch", "Please Try Again", "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    drawScreen("Registration", "Fingerprint Registered", "Scan ID Card Next", "", ILI9341_GREEN);
    signalSuccess();
    mode = MODE_REGISTER_RFID;
    return;
  }

  if (mode == MODE_REGISTER_RFID) {
    if (!nfcReady) {
      drawScreen("Registration", "RFID Reader", "Not Ready", "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    String uid;
    bool rfidOk = enrollRfid(uid);
    if (!rfidOk) {
      drawScreen("Registration", "RFID Mismatch", "Please Try Again", "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    pendingRfidUid = uid;
    String apiError;
    if (!registerCredentials(pendingFingerprintTemplateId, pendingRfidUid, apiError)) {
      finger.deleteModel(pendingFingerprintTemplateId);
      drawScreen("Registration", "Database Failure", apiError, "", ILI9341_RED);
      signalError();
      mode = MODE_HOME;
      return;
    }

    drawScreen("Registration Complete", String("ID: ") + String(pendingRegistrationUserId), pendingRegistrationName, "Fingerprint + RFID Success", ILI9341_GREEN);
    signalSuccess();
    delay(2500);

    pendingRegistrationUserId = 0;
    pendingRegistrationName = "";
    pendingFingerprintTemplateId = 0;
    pendingRfidUid = "";
    mode = MODE_HOME;
  }
}

bool enrollFingerprint(uint16_t templateId) {
  for (int scan = 1; scan <= 5; scan++) {
    drawScreen("Fingerprint", "Please Put Your Finger", String("Scan ") + String(scan) + " of 5", "", ILI9341_BLUE);

    uint8_t slot = scan == 1 ? 1 : 2;
    if (!waitForFingerprintImage(slot, FINGER_SCAN_TIMEOUT_MS)) {
      return false;
    }

    if (scan > 1) {
      uint8_t modelStatus = finger.createModel();
      if (modelStatus != FINGERPRINT_OK) {
        return false;
      }
    }

    signalFingerprint();
    drawScreen("Fingerprint", String("Scan ") + String(scan) + " of 5", "Accepted", "Remove finger", ILI9341_BLUE);
    waitForFingerRelease(8000);
    delay(450);
  }

  uint8_t storeStatus = finger.storeModel(templateId);
  return storeStatus == FINGERPRINT_OK;
}

bool waitForFingerprintImage(uint8_t slot, uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
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

  for (int scan = 1; scan <= 3; scan++) {
    drawScreen("RFID Registration", "Please Scan Your ID Card", String("Scan ") + String(scan) + " of 3", "", ILI9341_YELLOW);

    String currentUid;
    if (!readRfidUid(currentUid, RFID_SCAN_TIMEOUT_MS)) {
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
      drawScreen("Attendance", "Please Tap ID Card", String("Fingerprint ID: ") + attendanceFingerprintId, "", ILI9341_BLUE);
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
    drawScreen("Attendance", "Fingerprint Error", "Not Recognized", "", ILI9341_RED);
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
  AttendanceResult result = postAttendance(attendanceFingerprintId, attendanceRfidUid, occurredAt, localRecordId);

  if (result.ok) {
    appendAttendanceCsv(result.date, result.time, result.idNumber, result.fullName, result.status);
    drawScreen("Attendance Success", String("ID: ") + result.idNumber, result.fullName, String("Status: ") + result.status, ILI9341_GREEN);
    signalSuccess();
    delay(2500);
    return;
  }

  if (result.httpCode == 403) {
    drawScreen("Access Denied", "Fingerprint and RFID", "Do Not Match", "Access Denied", ILI9341_RED);
    signalUnauthorized();
    delay(2500);
    return;
  }

  LocalUser cached = findCachedUserByCredentials(attendanceFingerprintId, attendanceRfidUid);
  if (!cached.found) {
    drawScreen("Attendance Failure", "Cannot Validate", "No Local Match", "", ILI9341_RED);
    signalError();
    delay(2500);
    return;
  }

  DateTime now = currentDateTime();
  String date = String(now.year()) + "-" + (now.month() < 10 ? "0" : "") + String(now.month()) + "-" + (now.day() < 10 ? "0" : "") + String(now.day());
  char timeBuffer[12];
  snprintf(timeBuffer, sizeof(timeBuffer), "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
  String status = localNextStatus(date, cached.idNumber.length() ? cached.idNumber : cached.userId);

  appendAttendanceCsv(date, String(timeBuffer), cached.idNumber.length() ? cached.idNumber : cached.userId, cached.fullName, status);
  queueOfflineAttendance(localRecordId, occurredAt, attendanceFingerprintId, attendanceRfidUid);

  drawScreen("Saved Offline", String("ID: ") + (cached.idNumber.length() ? cached.idNumber : cached.userId), cached.fullName, String("Status: ") + status, ILI9341_YELLOW);
  signalSuccess();
  delay(2500);
}

void ensureSdFiles() {
  if (!sdReady) {
    return;
  }

  if (!SD.exists(ATTENDANCE_FILE)) {
    File file = SD.open(ATTENDANCE_FILE, FILE_WRITE);
    if (file) {
      file.println("Date,Time,ID,Name,Status");
      file.close();
    }
  }

  if (!SD.exists(UNSENT_FILE)) {
    File file = SD.open(UNSENT_FILE, FILE_WRITE);
    if (file) {
      file.close();
    }
  }
}

void appendLine(const char *path, const String &line) {
  if (!sdReady) {
    return;
  }

  File file = SD.open(path, FILE_APPEND);
  if (!file) {
    return;
  }
  file.println(line);
  file.close();
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
}

void syncOfflineRecords() {
  if (!sdReady || !wifiReady || !SD.exists(UNSENT_FILE)) {
    return;
  }

  File input = SD.open(UNSENT_FILE, FILE_READ);
  if (!input) {
    return;
  }

  SD.remove(UNSENT_TEMP_FILE);
  File output = SD.open(UNSENT_TEMP_FILE, FILE_WRITE);
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

  input.close();
  if (output) {
    output.close();
  }

  SD.remove(UNSENT_FILE);
  if (anyFailed) {
    SD.rename(UNSENT_TEMP_FILE, UNSENT_FILE);
  } else {
    SD.remove(UNSENT_TEMP_FILE);
    File emptyQueue = SD.open(UNSENT_FILE, FILE_WRITE);
    if (emptyQueue) {
      emptyQueue.close();
    }
  }

  if (anySynced) {
    signalSuccess();
  }
}

LocalUser findCachedUserByCredentials(const String &fingerprintId, const String &rfidUid) {
  LocalUser result;
  if (!sdReady || !SD.exists(USER_CACHE_FILE)) {
    return result;
  }

  File cache = SD.open(USER_CACHE_FILE, FILE_READ);
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

  if (cache) {
    cache.close();
  }
  return result;
}

String localNextStatus(const String &date, const String &id) {
  if (!sdReady || !SD.exists(ATTENDANCE_FILE)) {
    return "IN";
  }

  File file = SD.open(ATTENDANCE_FILE, FILE_READ);
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
  if (file) {
    file.close();
  }

  return count % 2 == 0 ? "IN" : "OUT";
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
  wifiReady = WiFi.status() == WL_CONNECTED;
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
