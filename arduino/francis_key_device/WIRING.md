# Wiring and GPIO Pin Mapping

Power all modules from a stable supply. The ESP32 logic pins are 3.3V. Use level shifting if your module version drives logic at 5V.

## GPIO table

| Hardware | Module pin | ESP32 pin | Notes |
|---|---:|---:|---|
| ILI9341 TFT | VCC | 3V3 or 5V per module | Many breakout boards accept 5V power but use 3.3V logic. |
| ILI9341 TFT | GND | GND | Common ground required. |
| ILI9341 TFT | SCK/CLK | GPIO18 | Shared SPI clock. |
| ILI9341 TFT | MISO/SDO | GPIO19 | Shared SPI MISO. |
| ILI9341 TFT | MOSI/SDI | GPIO23 | Shared SPI MOSI. |
| ILI9341 TFT | CS | GPIO5 | TFT chip select. |
| ILI9341 TFT | DC/RS | GPIO2 | Data/command. |
| ILI9341 TFT | RST | GPIO4 | Reset. |
| ILI9341 TFT | LED/BL/BLK | 3V3 | TFT backlight. Use 3.3V as the safe default. Some modules also allow 5V. |
| PN532 NFC/RFID V3 | VCC | 3V3 | Set PN532 board to I2C mode. |
| PN532 NFC/RFID V3 | GND | GND | Common ground required. |
| PN532 NFC/RFID V3 | SDA | GPIO21 | Shared I2C data. |
| PN532 NFC/RFID V3 | SCL | GPIO22 | Shared I2C clock. |
| PN532 NFC/RFID V3 | IRQ | GPIO34 | Input-only pin, used by Adafruit PN532 I2C driver. |
| PN532 NFC/RFID V3 | RSTO/RSTPDN | GPIO15 | PN532 reset. Keep it free from external pull-downs during boot. |
| DS3231 RTC | VCC | 3V3 | I2C device. |
| DS3231 RTC | GND | GND | Common ground required. |
| DS3231 RTC | SDA | GPIO21 | Shared with PN532. |
| DS3231 RTC | SCL | GPIO22 | Shared with PN532. |
| R307S Fingerprint | VCC | 5V or 3V3 per sensor spec | Many R307S units use 5V power and 3.3V TTL serial. |
| R307S Fingerprint | GND | GND | Common ground required. |
| R307S Fingerprint | TX | GPIO16 | ESP32 RX2. |
| R307S Fingerprint | RX | GPIO17 | ESP32 TX2. |
| Active buzzer | + | GPIO25 | Active buzzer control pin. |
| Active buzzer | - | GND | Use a transistor driver if the buzzer draws high current. |
| Red LED | Anode | GPIO26 through 220 ohm resistor | Error/failure. |
| Red LED | Cathode | GND |  |
| Blue LED | Anode | GPIO27 through 220 ohm resistor | Fingerprint scan detected. |
| Blue LED | Cathode | GND |  |
| Green LED | Anode | GPIO32 through 220 ohm resistor | Success/sync/IN/OUT. |
| Green LED | Cathode | GND |  |
| Yellow LED | Anode | GPIO33 through 220 ohm resistor | RFID scan detected. |
| Yellow LED | Cathode | GND |  |

## Bus layout

```text
ESP32 VSPI (TFT): GPIO18 SCK, GPIO19 MISO, GPIO23 MOSI
  - ILI9341 TFT uses CS GPIO5

ESP32 I2C: GPIO21 SDA, GPIO22 SCL
  - PN532 in I2C mode
  - DS3231 RTC

ESP32 UART2:
  - GPIO16 RX2 from R307S TX
  - GPIO17 TX2 to R307S RX
```

## Resistor placement

Each LED anode must connect through one 220 ohm resistor before reaching the ESP32 GPIO pin. The LED cathode goes to GND.
