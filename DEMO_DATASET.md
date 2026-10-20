# OrganChain — Evaluation Dataset & Algorithm 1 Benchmark

This dataset demonstrates the rule-based matching mechanism of **Algorithm 1** implemented in the `OrganTransplant.sol` smart contract.

---

## 1. Available Donor Profile

| Field | Details | Description |
|---|---|---|
| **Donor Name** | Ravi Kumar | Verified Organ Donor |
| **Pledged Organ** | **Kidney** | Organ available for allocation |
| **Blood Group** | **A** | Determines immunological compatibility |
| **Verification Status** | Verified | Authorized by Hospital Admin |
| **IPFS Medical CID** | `bafybeiravireport456` | Tamper-proof cryptographic record |

---

## 2. Recipient Waitlist Dataset (Algorithm 1 Evaluation)

The formula specified in Algorithm 1 computes a multi-criteria priority score:
$$\text{Score} = (w_1 \times \text{Urgency}) + (w_2 \times \text{Waiting Days})$$
*Where $w_1 = 70$ (Urgency Weight) and $w_2 = 30$ (Waiting Time Weight).*

| Patient ID | Patient Name | Organ Needed | Blood Group | Urgency (1–5) | Compatibility Check | Algorithm Score | Matching Outcome | Reason / Medical Justification |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **P-101** | **Rahul Sharma** | **Kidney** | **A** | **5 (Critical)** | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Highest clinical urgency with perfect ABO blood match. |
| **P-102** | Priya Nair | Kidney | A | 2 (Stable) | Compatible ✅ | 140 | Ranked #2 (Eligible) | Compatible blood type, but stable urgency (elective stage). |
| **P-103** | Kiran Rao | Kidney | B | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Blood group B cannot accept type A kidney (hyperacute rejection risk). |
| **P-104** | Ananya Sen | Heart | A | 5 (Critical) | **Incompatible** ❌ | **0** | Disqualified | Organ type mismatch (needs Heart, donor pledged Kidney). |

---

## 3. Blood Group Compatibility Matrix (ABO Compatibility)

In accordance with medical transplant guidelines encoded in `isCompatible()`:

| Donor Blood Group | Compatible Recipients | Incompatible Recipients | Notes |
|:---:|:---:|:---:|:---|
| **O** | **O, A, B, AB** | None | Universal Donor |
| **A** | **A, AB** | B, O | Safe for A and AB patients |
| **B** | **B, AB** | A, O | Safe for B and AB patients |
| **AB** | **AB only** | A, B, O | Universal Recipient only |

---

## 4. Key Takeaways for Project Presentation / Viva

1. **Deterministic & Fair**: No human administrator can manually bump Patient 2 or 3 above Patient 1. The smart contract automatically selects the candidate with the highest calculated medical score.
2. **Medical Safety Guarantee**: Biologically incompatible matches (wrong organ or conflicting ABO blood group) are automatically barred by the contract logic (`score = 0`).
3. **Auditability**: Once confirmed, the transaction creates an immutable entry in the `MatchLedger`, visible on Ethereum Sepolia for independent public auditing.
