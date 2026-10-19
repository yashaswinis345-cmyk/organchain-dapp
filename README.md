# OrganChain — Blockchain-Based Organ Transplantation Management

> **Live Deployment:**
> - **Frontend (Vercel):** [https://organchain-dapp-frontend.vercel.app](https://organchain-dapp-frontend.vercel.app)
> - **Network:** Ethereum Sepolia Testnet (Chain ID: `11155111`)
> - **Smart Contract Address:** [`0xdF1d9270175c1459250C59c956265c355FBd38b2`](https://sepolia.etherscan.io/address/0xdF1d9270175c1459250C59c956265c355FBd38b2)

A Hardhat + Solidity + MetaMask prototype implementing the Phase-1 design
from *"Blockchain-Based Organ Transplantation: A Decentralized Framework
for Secure Donor–Recipient Management Using Ethereum Smart Contracts and
IPFS,"* with a full multi-page dashboard: Home, Donor registration wizard,
Patient waitlist, Hospital verification admin, Organ Matching, and a
Match Ledger.

## 1. What's new in this version

Compared to a minimal three-tab prototype, this build adds a full
**hospital verification workflow** and an **explicit matching UI**:

- Anyone can **apply to become a hospital** (name + location); the
  contract owner (platform admin) reviews pending applicants and can
  **approve or reject** them, or directly register+verify a new hospital
  in one step.
- A dedicated **Matching page**: a hospital picks an organ and one of
  their verified, unmatched donors, runs matching, and sees every
  waitlisted patient needing that organ **ranked by priority score**,
  with incompatible patients clearly marked. The top-ranked eligible
  patient is pre-selected as the "Recommended match"; the hospital can
  also click any other eligible row before approving.
- A dedicated **Match Ledger page** listing every match ever recorded,
  with its confirmation status.
- The Donor flow is a **3-step wizard** (Details → Upload → Confirm)
  matching a real onboarding experience, with the document hash
  generated client-side (simulated IPFS) before the final on-chain
  transaction.

## 2. Project layout

```
organ-transplant-dapp/
├── contracts/
│   └── OrganTransplant.sol      # the smart contract
├── scripts/
│   └── deploy.js                # deployment script
├── test/
│   └── OrganTransplant.test.js  # Hardhat/Chai test suite
├── frontend/
│   ├── index.html               # React (no build step) + MetaMask UI
│   ├── app.js
│   ├── contract.js              # ABI + contract address config
│   └── style.css
├── hardhat.config.js
├── package.json
└── .env.example
```

## 3. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MetaMask](https://metamask.io/) browser extension

## 4. Install, compile, test

```bash
cd organ-transplant-dapp
npm install
npm run compile
npm test
```

All tests should pass — covering hospital application/approval/rejection,
donor/patient registration, `previewScore` eligibility filtering,
automatic matching (`findMatch`), explicit hospital-selected matching
(`matchDonorToPatient`), and match confirmation.

## 5. Run a local blockchain and deploy

**Terminal 1** — start Hardhat's local node (20 pre-funded test accounts):
```bash
npm run node
```
Keep this running. **Every time you restart it, the chain resets and you
must redeploy** (Step 6) and update the frontend address (Step 7) again.

**Terminal 2** — deploy:
```bash
npm run deploy:local
```
This prints the deployed contract address and confirms the deployer
account is the first **verified hospital ("Platform Admin")** — this is
also the contract `owner`, so it's the only account that can approve or
reject hospital applications.

## 6. Point the frontend at your contract

Open `frontend/contract.js` and paste the deployed address:
```js
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa";
```
Use the **exact address printed by the deploy script** — copy it
directly from the terminal rather than retyping it, to avoid checksum
typos (an all-lowercase address always works, since ethers skips
checksum validation for lowercase addresses).

## 7. Connect MetaMask to the local network

1. MetaMask → network dropdown → **Add network manually**:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`
2. Import test accounts from the private keys printed by `npm run node`:
   - **Account #0** → the deployer / platform admin (owner + first hospital)
   - **Account #1, #2** → use these for donor / patient / applicant-hospital demos

## 8. Run the frontend

No build step — static files using React + ethers.js from a CDN:
```bash
cd frontend
npx serve .
```
Open the printed URL in your browser (serving over `file://` won't work).

## 9. Suggested demo walkthrough

1. **Connect with Account #0** (admin). Go to **Hospital** — you'll see
   the admin panel with stats and an "Authorize a New Hospital" form.
   Authorize a second hospital address directly (e.g. paste Account #3's
   address with a name/location) — it appears immediately as Verified.
2. **Switch MetaMask to Account #1**, connect, go to **Donor** — walk
   through the 3-step wizard (Details → Upload → Confirm) and register.
3. **Switch to Account #2**, go to **Patient** — register on the
   waitlist with an urgency level.
4. **Switch back to Account #0** (hospital/admin):
   - **Hospital** page → "Pending donor verifications" → Verify the donor.
   - **Matching** page → select the organ and the now-verified donor →
     **Run Matching** → see the ranked patient table → the eligible
     patient is pre-selected as "Recommended match" → **Approve Match**.
   - **Match Ledger** page → see the new match listed as Approved.
5. To demo the **self-service hospital application**, connect with a
   fresh account (e.g. Account #4), go to **Hospital** — you'll see an
   "Apply" form instead of the admin panel. Submit it, then switch back
   to Account #0 to **Approve** or **Reject** it from the registry table.

This walkthrough exercises every module from the paper: Donor
Onboarding, Recipient Waitlist, Matching Logic (Algorithm 1), and
Storage/Security (IPFS hash anchoring + hospital-gated access control).

## 10. A note on the "Match Score" shown in the UI

The **Matching page's displayed score** (e.g. "94 / 100") is a
**client-side illustrative breakdown** — 50% compatibility + 30% urgency
+ 20% waiting time — purely for ranking and readability in the UI. The
contract's **actual, authoritative scoring** (used by `findMatch` and
`matchDonorToPatient` to decide eligibility and ranking) is the paper's
Algorithm 1 formula: `score = w1·urgency + w2·waitingDays`, with
`w1=70, w2=30` by default (tunable by the owner via `updateWeights`).
Compatibility and organ-match are binary gates on-chain, not part of the
weighted score — the UI's 50/30/20 framing is a presentation choice to
make relative priority easier to read at a glance. This distinction is
worth mentioning explicitly in your report/viva as a deliberate
UI-vs-contract design decision.

## 11. Using real IPFS instead of the simulated hash

`frontend/app.js → simulateIpfsUpload` hashes the uploaded file (or a
JSON blob of the form fields, if no file is chosen) client-side to keep
the demo dependency-free. To use real IPFS storage, swap this function
for a call to [web3.storage](https://web3.storage) or
[Pinata](https://www.pinata.cloud/)'s upload API, which returns a real
CID — everything else (the on-chain `docHash` field, verification flow)
stays identical.

## 12. Deploying to a public testnet (optional)

1. Get a free Sepolia RPC URL from Infura or Alchemy.
2. Copy `.env.example` to `.env`, fill in `SEPOLIA_RPC_URL` and a
   `PRIVATE_KEY` for a **dedicated test wallet** (never a real-funds key).
3. Fund it with Sepolia test ETH from a public faucet.
4. `npm run deploy:sepolia`, then update `frontend/contract.js`'s
   `CONTRACT_ADDRESS` and `EXPECTED_CHAIN_ID` (Sepolia is `11155111`).

## 13. How this maps to the paper

| Paper section | Where it lives here |
|---|---|
| Struct-based data model (Section III) | `Donor` / `Patient` / `HospitalInfo` structs |
| `onlyHospital` access control | modifier; enforced on `verifyDonor`, `findMatch`, `matchDonorToPatient`, `confirmMatch` |
| Algorithm 1 (Section III) | `previewScore()` + `findMatch()` — filter, score, argmax |
| Gas-free reads (Table II) | `getDonorList`, `getPatientList`, `getHospitalAddresses`, public mapping getters |
| IPFS hash anchoring | `docHash` field + `simulateIpfsUpload` in the frontend |
| MetaMask identity/signing | `ethers.BrowserProvider` + `eth_requestAccounts` |
| Fig. 2 confirmation step | `confirmMatch()` and the Match Ledger page |
| Role-based access / governance | hospital application → owner approval/rejection workflow |

## 14. Known limitations

- Phase-1 prototype on a local network, not benchmarked on a multi-node
  consortium testbed (matches the paper's own stated Section IV.C limitation).
- IPFS storage is simulated client-side rather than using a live pinning
  service (see Section 11 above for swapping it in).
- Blood-group compatibility is simplified to ABO-only (O universal
  donor, AB universal recipient) — the paper's Section V future-work
  item suggests extending this to a CPRA/OPTN-weighted immunological score.
- The displayed "Match Score" on the Matching page is an illustrative
  0–100 breakdown for the UI; the authoritative on-chain decision uses
  the paper's `w1·urgency + w2·waitingDays` formula (see Section 10 above).
