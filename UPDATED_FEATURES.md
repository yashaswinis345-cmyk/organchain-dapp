# OrganChain — Comprehensive Updated Features Guide

> **Live Application**: [https://organchain-dapp-frontend.vercel.app](https://organchain-dapp-frontend.vercel.app)  
> **Network**: Ethereum Sepolia Testnet (`11155111`)  
> **Smart Contract**: [`0xdF1d9270175c1459250C59c956265c355FBd38b2`](https://sepolia.etherscan.io/address/0xdF1d9270175c1459250C59c956265c355FBd38b2)  
> **Source Repository**: [GitHub](https://github.com/yashaswinis345-cmyk/organchain-dapp)  
> **Benchmark Dataset**: [DEMO_DATASET.md](DEMO_DATASET.md)

---

## Executive Summary

OrganChain is an end-to-end, decentralized organ donation and algorithmic allocation protocol built on Ethereum smart contracts, IPFS content-addressed hashing, and role-based cryptographic verification.

Below is an exhaustive log of all production features, clinical safeguards, and user-experience upgrades implemented in this latest version.

---

## 🌟 Complete Feature Index

### 1. 🚚 Cold-Chain Organ Transit Tracker & IoT Telemetry System *(Flagship Feature)*
* **Location**: Sidebar Navigation (`🚚 Transit Tracker`) & Match Ledger (`🛰️ Transit` button on any allocation row)
* **Hardware & Firmware Specification**: [`iot/esp32_firmware.ino`](iot/esp32_firmware.ino) and [`iot/IOT_SPECIFICATION.md`](iot/IOT_SPECIFICATION.md)
* **Functionality**:
  - **Live IoT Sensor Telemetry HUD**: Real-time display of core organ perfusion temperature (dynamically fluctuating in the $2.0^\circ\text{C} – 4.0^\circ\text{C}$ safe zone with visual status pulse).
  - **Cold Ischemia Viability Countdown Clock**: Ticking countdown timer calculating remaining biological viability hours before tissue necrosis (Heart: 4–6h, Lung: 6–8h, Liver: 8–12h, Kidney: 24–36h).
  - **Live GPS & Container Security**: Continuous streaming coordinates (`12.9716° N, 77.5946° E`), transit speed (`74 km/h`), altitude, and tamper-seal pressure sensor (`1013 hPa · Zero Breaches`).
  - **Interactive 5-Waypoint Route Visualizer**: Dynamic progress stepper connecting *Organ Procured ➔ Cryo-Sealed ➔ In-Transit (Green Corridor) ➔ ICU Intake ➔ Implantation*.
  - **Multi-Signature Chain of Custody**: Cryptographic handoff logs signed by procuring surgeon, certified logistics courier, and recipient ICU director, with interactive **`✍️ Sign & Advance Handoff`** action.

### 2. 🟢 Live Blockchain Heartbeat & Block Height Monitor
* **Location**: Top Navigation Bar (Always Visible)
* **Functionality**:
  - Live pulsing status pill displaying real-time connectivity to Ethereum Sepolia.
  - Automatically queries the provider every 12 seconds to report the latest confirmed Sepolia block height (e.g., `#7059124`).
  - Reports network gas health (`Gas: Normal`).
  - Instantly alerts users if their MetaMask is disconnected or connected to the wrong network.

### 2. 💡 Interactive "How It Works" Protocol Tour Modal
* **Location**: Top Navigation Bar (`💡 How It Works` button)
* **Functionality**:
  - Accessible to all evaluators, patients, and doctors without requiring MetaMask login.
  - An interactive, 5-stage walkthrough illustrating the complete lifecycle of an organ transplant:
    1. **Donor & Patient Onboarding**: Self-sovereign identity registration with SHA-256 / keccak256 IPFS document hashing.
    2. **Cryptographic Hospital Governance**: Multi-hospital licensing via contract owner approval.
    3. **Deterministic Algorithmic Matching**: Pure on-chain execution of Algorithm 1 (ABO compatibility + Urgency + Wait time).
    4. **Cold Ischemia Time (CIT) Safeguard**: Biological organ preservation time tracking.
    5. **Immutable Public Audit Trail**: Indelible on-chain records and tamper-evident allocation certificates.

### 3. 📄 Official Transplant Allocation Certificate
* **Location**: Match Ledger page (`📄 Certificate` button on any allocation row)
* **Functionality**:
  - Generates a formal, printable hospital transplant certificate for any on-chain match.
  - **Dynamic Certificate ID**: Format `CERT-OC-SEP-000X`.
  - **Donor Record**: Name/anonymized address, organ pledged, ABO blood group, wallet address.
  - **Recipient Record**: Name, waitlist status, clinical urgency rating (1–5), ABO blood group, wallet address.
  - **Smart Contract Verification**: Direct timestamp, transaction status, and contract reference.
  - **Live Scannable QR Code**: Automatically generated QR code linking directly to the Sepolia Etherscan contract explorer.
  - **Official Stamped Watermark**: Styled gold/bronze wax seal badge (`SEPOLIA VERIFIED · ORGANCHAIN`).
  - **Print / PDF Export**: Built-in `window.print()` action with optimized `@media print` CSS rules isolating the certificate.

### 4. 🔍 Real-Time Multi-Parametric Search & Organ Filters
* **Location**: Match Ledger page
* **Functionality**:
  - **Organ Category Filter Pills**: Instant one-click filtering by organ (`All`, `Kidney`, `Liver`, `Heart`, `Lung`, `Pancreas`, `Cornea`).
  - **Omni-Search Bar**: Real-time substring matching across donor wallet, recipient wallet, patient name, donor name, organ type, and ABO blood group.
  - **Dynamic Match Counter**: Real-time indicator displaying `Showing X of Y recorded allocations` with a live verified badge.
  - **Responsive Fallbacks**: Elegant empty-state prompts when query parameters yield zero matches.

### 5. 📋 One-Click "Copy to Clipboard" with Micro-Interactions
* **Location**: Everywhere Ethereum addresses, contract references, or transaction hashes appear
* **Functionality**:
  - Embedded `📋` button beside every address across the topbar, tables, modal dialogs, and footnotes.
  - Clicking copies the exact raw 42-character hex address directly to the clipboard.
  - Immediate visual micro-animation toggling the icon to `✓` and alerting the user via accessible tooltips.

### 6. 🪪 Digital Organ Donor Card with Scannable QR Code
* **Location**: Donor Portal (available immediately upon donor pledge)
* **Functionality**:
  - Digital wallet pass displaying the donor's name, pledged organ, blood group, wallet address, and IPFS document CID.
  - Embedded scannable QR code directing emergency medical staff to the donor's on-chain Etherscan verification page.
  - Print & Save PDF trigger button formatted for physical wallet card sizes.

### 7. 📊 Live Visual Analytics Dashboard
* **Location**: Home Page
* **Functionality**:
  - **Organ Demand vs. Supply Breakdown**: Visual grid displaying registered donors vs. waiting patients for each organ (Kidney, Liver, Heart, Lung, Pancreas, Cornea).
  - **Clinical Urgency Distribution**: Horizontal progress bars displaying the distribution of patients waiting across Urgency Level 1 (Low) to Level 5 (Critical/ICU).
  - Real-time aggregation calculated directly from Sepolia state storage.

### 8. 🧭 Cold Ischemia Time (CIT) Viability Safeguard
* **Location**: Organ Matching Page
* **Functionality**:
  - Prominent biological countdown warning banner displayed when selecting an organ for matching:
    - **Heart**: 4 – 6 Hours viability
    - **Lung**: 6 – 8 Hours viability
    - **Liver**: 8 – 12 Hours viability
    - **Kidney**: 24 – 36 Hours viability
    - **Pancreas**: 12 – 18 Hours viability
    - **Cornea**: Up to 14 Days preservation
  - Educates medical staff on mandatory logistics and transportation constraints before committing an allocation.

### 9. 🔗 Deep Sepolia Etherscan Integration
* **Location**: Across all pages and tables
* **Functionality**:
  - All addresses formatted as direct links to Sepolia Etherscan (`https://sepolia.etherscan.io/...`).
  - Contract address highlighted in header and footer with one-click block explorer navigation.

### 10. 🏥 Full Cryptographic Hospital Verification Workflow
* **Location**: Hospital Portal
* **Functionality**:
  - Hospitals submit registration requests on-chain (`applyForHospital`).
  - Contract administrator reviews pending applications and accepts or rejects them (`approveHospital` / `rejectHospital`).
  - Only approved hospitals hold authorization to verify donor medical records and authorize organ allocations (`onlyHospital` modifier).

### 11. ⚖️ Algorithmic Priority Matching (Algorithm 1)
* **Location**: Matching Portal
* **Functionality**:
  - **ABO Compatibility Check**: Strict biological compatibility logic (Universal Donor O, Universal Recipient AB, identical blood groups).
  - **Clinical Urgency Weight**: Urgency score (1 to 5) prioritized with customizable weights.
  - **Waiting Time Prioritization**: FIFO queue ordering using block timestamps to prevent waitlist discrimination.
  - **Real-Time Eligibility Previews**: Clear distinction between `Eligible` candidates and `Incompatible` patients.

### 12. 📦 Comprehensive On-Chain Benchmark Dataset (33 Cases)
* **Location**: Sepolia Blockchain State (documented in [DEMO_DATASET.md](DEMO_DATASET.md))
* **Functionality**:
  - **10 Verified Donors**: Spanning multiple organs (Kidney, Liver, Heart, Lung, Pancreas, Cornea) and diverse blood groups (O+, A+, B+, AB+, O-).
  - **23 Waitlisted Patients**: Clinical urgency distribution from Level 1 to Level 5.
  - Multiple completed matches in the ledger demonstrating the entire end-to-end lifecycle.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Smart Contracts** | Solidity `^0.8.20`, Hardhat, OpenZeppelin Ownable |
| **Blockchain Network** | Ethereum Sepolia Testnet (Chain ID: `11155111`) |
| **Frontend Framework** | React 18, Babel Standalone (zero-build deployment) |
| **Web3 Library** | ethers.js v6 (`ethers.BrowserProvider`, `ethers.Contract`) |
| **Styling & Design** | Vanilla CSS (Dark Glassmorphic Design System, HSL palette) |
| **Hosting & CI/CD** | Vercel (Auto-deployment via GitHub `main` branch) |
| **Storage & Identity** | IPFS (Simulated SHA-256 client CIDs), MetaMask |

---

*Authored for academic evaluations, research vivas, and production demonstrations.*
