# Device API Contract

The firmware connects to:

```text
api/device.php
```

Default local URL from the ESP32 should look like:

```text
http://<YOUR_PC_LAN_IP>/fingerprint/api/device.php
```

All requests require the header:

```text
X-Device-Key: change-me-francis-key-device
```

For production, change the key in the ESP32 settings and set the PHP environment variable:

```text
FRANCIS_KEY_DEVICE_KEY
```

## Status

```bash
curl -H "X-Device-Key: change-me-francis-key-device" \
  "http://localhost/fingerprint/api/device.php?action=status"
```

Response:

```json
{
  "ok": true,
  "deviceApi": "ready",
  "database": "ready",
  "timeZone": "Asia/Manila"
}
```

## Active users

```bash
curl -H "X-Device-Key: change-me-francis-key-device" \
  "http://localhost/fingerprint/api/device.php?action=users"
```

Response:

```json
{
  "ok": true,
  "users": [
    {
      "id": 4,
      "idNumber": "STU-0901",
      "fullName": "Mika Cruz Santos",
      "role": "student",
      "status": "Active",
      "department": "BSIT 3A",
      "smartCardId": "04AABBCCDD",
      "fingerprintId": "4"
    }
  ]
}
```

## Register credentials

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "X-Device-Key: change-me-francis-key-device" \
  -d "{\"userId\":4,\"fingerprintId\":\"4\",\"smartCardId\":\"04AABBCCDD\",\"deviceId\":\"ESP32-FRANCIS-KEY-01\"}" \
  "http://localhost/fingerprint/api/device.php?action=register"
```

This updates the selected row in `users.fingerprintId` and `users.smartCardId`. The ESP32 also writes the registered credentials to its local SD user cache after a successful response.

## Save attendance

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "X-Device-Key: change-me-francis-key-device" \
  -d "{\"fingerprintId\":\"4\",\"smartCardId\":\"04AABBCCDD\",\"deviceId\":\"ESP32-FRANCIS-KEY-01\",\"occurredAt\":\"2026-06-26T08:00:00+08:00\",\"localRecordId\":\"ESP32-FRANCIS-KEY-01-1\"}" \
  "http://localhost/fingerprint/api/device.php?action=attendance"
```

The ESP32 validates attendance locally before calling this endpoint. The API still accepts attendance only when fingerprint and RFID belong to the same active user in the online database.

Response:

```json
{
  "ok": true,
  "duplicate": false,
  "attendanceId": 1,
  "status": "IN",
  "date": "2026-06-26",
  "time": "08:00:00",
  "user": {
    "id": 4,
    "idNumber": "STU-0901",
    "fullName": "Mika Cruz Santos"
  }
}
```

## Attendance security failure

If fingerprint and RFID belong to different users:

```json
{
  "ok": false,
  "error": "Fingerprint and RFID do not belong to the same active user.",
  "fingerprintUser": { "id": 4, "fullName": "Mika Cruz Santos" },
  "cardUser": { "id": 5, "fullName": "Paolo Diaz Reyes" }
}
```

No attendance record is saved in this case.
