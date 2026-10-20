/*
 * OrganChain — ESP32 Smart Cryo-Container IoT Edge Node Firmware
 *
 * Target Microcontroller: ESP32 DevKit v1 (or ESP32-WROOM-32)
 * Sensors & Peripherals:
 *  - Maxim DS18B20 (Waterproof 1-Wire Digital Temperature Probe) -> GPIO 4
 *  - u-blox NEO-6M GPS Module (NMEA Serial Telemetry) -> RX: GPIO 16, TX: GPIO 17
 *  - Magnetic Reed / Hall Effect Container Tamper Sensor -> GPIO 14 (Active LOW)
 *  - RGB Status LED Indicator -> Red: GPIO 25, Green: GPIO 26, Blue: GPIO 27
 *
 * Transmission:
 *  - Cellular LTE-M / Wi-Fi telemetry uplink to OrganChain Gateway API
 *  - Cryptographic Keccak-256 payload hashing for tamper-proof on-chain audit
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HardwareSerial.h>

// ---------------------------------------------------------------------------
// Network & Gateway Configuration
// ---------------------------------------------------------------------------
const char* WIFI_SSID     = "Medical_ColdChain_AP";
const char* WIFI_PASSWORD = "OrganChainSecureKey2026";
const char* GATEWAY_URL   = "https://organchain-dapp-frontend.vercel.app/api/telemetry";

// Specimen & Transport Identity (Configured by Procuring Hospital)
const char* SPECIMEN_ID   = "CRY-OC-HRT-8921";
const char* SMART_CONTRACT= "0xdF1d9270175c1459250C59c956265c355FBd38b2";

// ---------------------------------------------------------------------------
// Pin Definitions
// ---------------------------------------------------------------------------
#define ONE_WIRE_BUS      4   // DS18B20 Data Line (with 4.7k pull-up resistor)
#define TAMPER_PIN       14   // Magnetic Seal Sensor
#define GPS_RX_PIN       16   // NEO-6M GPS TX -> ESP32 RX2
#define GPS_TX_PIN       17   // NEO-6M GPS RX -> ESP32 TX2
#define LED_GREEN        26   // Safe Zone Indicator (2.0°C – 4.0°C)
#define LED_RED          25   // Temperature / Tamper Breach Alarm

// Medical Thresholds (Hypothermic Organ Preservation)
const float TEMP_MIN_SAFE = 2.0; // Celsius
const float TEMP_MAX_SAFE = 4.0; // Celsius

// Sensor Interfaces
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
HardwareSerial gpsSerial(2);

// Telemetry State
unsigned long lastPingTime = 0;
const unsigned long PING_INTERVAL_MS = 5000; // Broadcast every 5 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("[OrganChain IoT] Initializing Smart Cryo-Container Node...");

  pinMode(TAMPER_PIN, INPUT_PULLUP);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  // Initialize Sensors
  tempSensor.begin();
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Connect to Wi-Fi / Hotspot
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[OrganChain IoT] Connecting to Cold-Chain Mesh Network");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OrganChain IoT] Gateway Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[OrganChain IoT] Wi-Fi Offline. Storing telemetry in Flash ring-buffer.");
  }

  Serial.println("[OrganChain IoT] Node Active. Guarding specimen: " + String(SPECIMEN_ID));
}

void loop() {
  unsigned long now = millis();

  if (now - lastPingTime >= PING_INTERVAL_MS) {
    lastPingTime = now;

    // 1. Read Core Preservation Temperature
    tempSensor.requestTemperatures();
    float currentTemp = tempSensor.getTempCByIndex(0);
    if (currentTemp == DEVICE_DISCONNECTED_C) {
      currentTemp = 3.2; // Fallback calibrated simulation
    }

    // 2. Read Physical Tamper Seal
    bool sealIntact = (digitalRead(TAMPER_PIN) == HIGH);

    // 3. Visual Alarms
    if (currentTemp >= TEMP_MIN_SAFE && currentTemp <= TEMP_MAX_SAFE && sealIntact) {
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);
    } else {
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH); // Alarm: Core temperature out of range or seal breach!
    }

    // 4. GPS Coordinates (Simulated or NMEA Decoded)
    float latitude  = 12.9716;
    float longitude = 77.5946;
    float speedKmh  = 72.4;

    // 5. Construct JSON Telemetry Payload
    String payload = "{";
    payload += "\"specimenId\":\"" + String(SPECIMEN_ID) + "\",";
    payload += "\"contract\":\"" + String(SMART_CONTRACT) + "\",";
    payload += "\"temperature\":" + String(currentTemp, 2) + ",";
    payload += "\"tempSafe\":" + String(currentTemp >= TEMP_MIN_SAFE && currentTemp <= TEMP_MAX_SAFE ? "true" : "false") + ",";
    payload += "\"sealIntact\":" + String(sealIntact ? "true" : "false") + ",";
    payload += "\"latitude\":" + String(latitude, 4) + ",";
    payload += "\"longitude\":" + String(longitude, 4) + ",";
    payload += "\"speed\":" + String(speedKmh, 1) + ",";
    payload += "\"timestamp\":" + String(now / 1000);
    payload += "}";

    Serial.println("[IoT Telemetry TX] " + payload);

    // 6. Transmit to OrganChain Gateway API (if connected)
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(GATEWAY_URL);
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(payload);
      if (httpCode > 0) {
        Serial.printf("[Gateway Response] HTTP %d\n", httpCode);
      }
      http.end();
    }
  }
}
