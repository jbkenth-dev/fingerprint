#pragma once

static constexpr uint8_t SPI_SCLK_PIN = 18;
static constexpr uint8_t SPI_MISO_PIN = 19;
static constexpr uint8_t SPI_MOSI_PIN = 23;

static constexpr uint8_t TFT_CS_PIN = 5;
static constexpr uint8_t TFT_DC_PIN = 2;
static constexpr uint8_t TFT_RST_PIN = 4;

// SD on dedicated HSPI bus (not shared with TFT VSPI)
static constexpr uint8_t SD_SCLK_PIN = 14;
static constexpr uint8_t SD_MISO_PIN = 35;  // input-only — MISO is input to ESP32
static constexpr uint8_t SD_MOSI_PIN = 13;
static constexpr uint8_t SD_CS_PIN = 12;   // needs 10kΩ pull-down to GND (GPIO12 strapping)

static constexpr uint8_t I2C_SDA_PIN = 21;
static constexpr uint8_t I2C_SCL_PIN = 22;
static constexpr uint8_t PN532_IRQ_PIN = 34;
static constexpr uint8_t PN532_RESET_PIN = 15;

static constexpr uint8_t FINGERPRINT_RX_PIN = 16; // ESP32 RX2 <- R307S TX
static constexpr uint8_t FINGERPRINT_TX_PIN = 17; // ESP32 TX2 -> R307S RX

static constexpr uint8_t BUZZER_PIN = 25;
static constexpr uint8_t RED_LED_PIN = 26;
static constexpr uint8_t BLUE_LED_PIN = 27;
static constexpr uint8_t GREEN_LED_PIN = 32;
static constexpr uint8_t YELLOW_LED_PIN = 33;

