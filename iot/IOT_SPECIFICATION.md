# OrganChain — IoT Cold-Chain Hardware Specification & Architecture

> **Component**: Autonomous Cryo-Preservation Organ Container Edge Node  
> **Firmware Source**: [`iot/esp32_firmware.ino`](esp32_firmware.ino)  
> **Target Platform**: ESP32 Microcontroller (Tensilica Xtensa Dual-Core 32-bit LX6)  
> **Blockchain Integration**: Ethereum Sepolia (`0xdF1d9270175c1459250C59c956265c355FBd38b2`)

---

## 1. System Architecture

```
+-----------------------------------------------------------------------------------+
|               SMART CRYO-CONTAINER EDGE NODE (PHYSICAL HARDWARE)                  |
|                                                                                   |
|  +--------------------+    +--------------------+    +--------------------+       |
|  |  DS18B20 Temp Probe|    |  NEO-6M GPS Module |    |  Magnetic Seal     |       |
|  |  (2.0°C - 4.0°C)   |    |  (Lat, Lon, Speed) |    |  (Tamper Detect)   |       |
|  +---------+----------+    +---------+----------+    +---------+----------+       |
|            |                         |                         |                  |
|            +-------------------------+-------------------------+                  |
|                                      |                                            |
|                                      v                                            |
|                           +---------------------+                                 |
|                           |   ESP32 Micro-MCU   |                                 |
|                           |  Keccak-256 Signer  |                                 |
|                           +----------+----------+                                 |
+--------------------------------------|--------------------------------------------+
                                       | HTTPS / JSON Telemetry Stream
                                       v
+-----------------------------------------------------------------------------------+
|                           ORGANCHAIN CLOUD & ORACLE GATEWAY                       |
|                                                                                   |
|      +---------------------------------------------------------------------+      |
|      |  REST & WebSocket Telemetry Gateway (/api/telemetry)                |      |
|      |  - Validates container cryptographic signature                     |      |
|      |  - Checks temperature breaches against Cold Ischemia Limits (CIT)   |      |
|      |  - Commits abnormal breach proofs to Ethereum Sepolia Smart Contract|      |
|      +---------------------------------+-----------------------------------+      |
+----------------------------------------|------------------------------------------+
                                         |
                  +----------------------+----------------------+
                  v                                             v
+------------------------------------+        +-------------------------------------+
|    ORGANCHAIN BROWSER DAPP HUD     |        |   ETHEREUM SEPOLIA SMART CONTRACT   |
|                                    |        |                                     |
| - Live Temperature Gauge (3.2°C)   |        | - Multi-Sig Custody Checkpoints     |
| - CIT Remaining Viability Clock    |        | - Tamper-Proof Audit Event Logs     |
| - Real-time GPS Route Waypoints    |        | - Contract: 0xdF1d92...FBd38b2     |
+------------------------------------+        +-------------------------------------+
```

---

## 2. Hardware Bill of Materials (BOM)

| Component | Model / Part No. | Operational Purpose | Operating Range / Specs |
|---|---|---|---|
| **Microcontroller** | ESP32-WROOM-32 DevKit | Edge computation & Keccak-256 telemetry signing | 240 MHz Dual-Core, 520 KB SRAM, 2.4 GHz Wi-Fi / BLE |
| **Temperature Sensor** | Dallas/Maxim DS18B20 | Waterproof core organ perfusion temperature monitoring | $-55^\circ\text{C}$ to $+125^\circ\text{C}$ ($\pm 0.5^\circ\text{C}$ accuracy, 12-bit) |
| **GPS Tracking Module** | u-blox NEO-6M | Real-time vehicle / green-corridor flight tracking | 50-channel receiver, 2.5m CEP horizontal accuracy |
| **Tamper Sensor** | Littelfuse Reed / Hall Effect | Detects unauthorized opening of container lid in transit | Digital Active-LOW, Hermetically sealed |
| **Status Display** | Bicolor / RGB LED + Buzzer | Visual & audible alarm for transit courier if temperature deviates | Green = Safe ($2^\circ\text{C}-4^\circ\text{C}$), Red/Buzzer = Breach |
| **Power Supply** | 3.7V 2600mAh 18650 Li-Ion + UPS Shield | Uninterrupted portable power throughout long-distance transit | Up to 18 hours autonomous operation on single charge |

---

## 3. Circuit Wiring & Pinout Guide

| ESP32 GPIO Pin | Connected Sensor | Sensor Wire Color | Interface Type / Notes |
|---|---|---|---|
| **GPIO 4** | DS18B20 Data Pin (DQ) | Yellow / White | 1-Wire Bus (Requires 4.7kΩ pull-up to 3.3V) |
| **GPIO 14** | Magnetic Reed Tamper Switch | Pin 1 | Digital Input with internal pull-up (`INPUT_PULLUP`) |
| **GPIO 16 (RX2)** | NEO-6M GPS TX Pin | TX Wire | Hardware UART2 Serial receive (9600 baud) |
| **GPIO 17 (TX2)** | NEO-6M GPS RX Pin | RX Wire | Hardware UART2 Serial transmit (9600 baud) |
| **GPIO 26** | Green Status LED | Anode (+) | Digital Output (Through 220Ω resistor) |
| **GPIO 25** | Red Alarm LED + Buzzer | Anode (+) | Digital Output (Through 220Ω resistor) |
| **3.3V / VCC** | Sensor VCC Rails | Red | Regulated 3.3V Power Bus |
| **GND** | Sensor Grounds | Black | Common System Ground |

---

## 4. Medical Cold Ischemia Time (CIT) Viability Matrix

Organs preserved hypothermically experience rapid biological cellular degradation if temperatures exceed $4.0^\circ\text{C}$ or freeze below $0^\circ\text{C}$. The IoT edge container enforces strict medical countdown rules:

| Organ | Target Core Temperature | Critical Cold Ischemia Time (CIT) Limit | Sensor Alarm Trigger |
|---|---|---|---|
| **Heart** | $2.0^\circ\text{C} - 4.0^\circ\text{C}$ | **4 – 6 Hours** | Alert if $> 4.0^\circ\text{C}$ for $> 5$ mins or time $> 4\text{h}$ |
| **Lung** | $2.0^\circ\text{C} - 4.0^\circ\text{C}$ | **6 – 8 Hours** | Alert if $> 4.0^\circ\text{C}$ for $> 10$ mins or time $> 6\text{h}$ |
| **Liver** | $2.0^\circ\text{C} - 4.0^\circ\text{C}$ | **8 – 12 Hours** | Alert if $> 4.0^\circ\text{C}$ for $> 15$ mins or time $> 10\text{h}$ |
| **Kidney** | $2.0^\circ\text{C} - 4.0^\circ\text{C}$ | **24 – 36 Hours** | Alert if $> 4.0^\circ\text{C}$ for $> 30$ mins or time $> 24\text{h}$ |
| **Pancreas** | $2.0^\circ\text{C} - 4.0^\circ\text{C}$ | **12 – 18 Hours** | Alert if $> 4.0^\circ\text{C}$ for $> 15$ mins or time $> 12\text{h}$ |
| **Cornea** | $2.0^\circ\text{C} - 6.0^\circ\text{C}$ | **Up to 14 Days** | Alert if $> 6.0^\circ\text{C}$ |

---

## 5. Live dApp Simulation vs. Physical Deployment

To ensure maximum presentation reliability and zero demo failures:
1. **In the Web App**: The dApp's **Transit Tracker** (`frontend/app.js`) includes a built-in autonomous IoT telemetry emulator that models the real ESP32 sensor output with continuous temperature fluctuations (`3.1°C – 3.3°C`), ticking CIT countdown, and multi-sig custody handoffs.
2. **In Physical Lab Tests**: The [`esp32_firmware.ino`](esp32_firmware.ino) sketch can be flashed directly onto an ESP32 board using Arduino IDE to stream live telemetry over Wi-Fi or cellular uplink.

---

## 6. Viva Defense & Examination Talking Points

* **Q: Why combine IoT with Blockchain?**  
  *A: Blockchain guarantees that records cannot be altered retroactively. IoT guarantees that real-world physical conditions (temperature, location, container breaches) are captured autonomously without relying on human honesty. Together, they create an unbroken chain of custody from donor operating room to recipient ICU.*

* **Q: What happens if temperature spikes above 4°C in transit?**  
  *A: The ESP32 triggers a visual/audible alert for the courier, logs the breach timestamp, and flags the specimen on the transit dashboard. The receiving transplant surgeons can review the thermal breach history before proceeding with surgery.*

* **Q: How does this prevent organ black-market trafficking?**  
  *A: Every container has a cryptographically sealed Specimen ID anchored to an on-chain match record. Physical possession cannot be transferred without digital signatures from authorized hospital personnel at each checkpoint.*
