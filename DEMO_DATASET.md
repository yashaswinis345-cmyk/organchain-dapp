# OrganChain — Hospital Benchmark Dataset (19 Cases)

This clinical benchmark dataset models multi-organ allocation across **Kidney**, **Liver**, **Heart**, **Cornea**, and **Lung** under Algorithm 1.

---

## 1. Registered & Verified Donors

| # | Donor Name | Organ Pledged | Blood Group | Verification Status | Biological Match Characteristics |
|:---:|:---|:---:|:---:|:---:|:---|
| **D1** | **Ravi Kumar** | **Kidney** | **A** | Verified ✅ | Compatible with A and AB patients |
| **D2** | **Deepak Verma** | **Liver** | **O** | Verified ✅ | **Universal Donor** (Compatible with O, A, B, AB) |
| **D3** | **Sneha Patil** | **Heart** | **B** | Verified ✅ | Compatible with B and AB patients |
| **D4** | **Amitabh Sen** | **Kidney** | **AB** | Verified ✅ | Compatible only with AB recipients |
| **D5** | **Meera Joshi** | **Cornea** | **A** | Verified ✅ | Compatible with A and AB patients |

---

## 2. Recipient Waitlist & Multi-Organ Allocation Cases

Algorithm 1 Priority Score:
$$\text{Score} = (70 \times \text{Urgency}) + (30 \times \text{Waiting Days})$$

### 🫘 Category 1: Kidney Allocation (Donor: Ravi Kumar, Blood A)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Rahul Sharma** | Kidney | A | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Highest clinical urgency with identical blood group. |
| **Priya Nair** | Kidney | A | 2 (Stable) | **Compatible** ✅ | **140** | Ranked #2 (Eligible) | Compatible, but lower urgency score. |
| **Kiran Rao** | Kidney | B | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Blood group B cannot accept A kidney. |

---

### 🫀 Category 2: Liver Allocation (Donor: Deepak Verma, Universal Blood O)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Siddharth Roy** | Liver | O | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Critical end-stage liver disease, identical O match. |
| **Kavita Reddy** | Liver | A | 4 (High) | **Compatible** ✅ | **280** | Ranked #2 (Eligible) | O is universal donor; compatible with type A. |
| **Manoj Tiwari** | Liver | B | 2 (Stable) | **Compatible** ✅ | **140** | Ranked #3 (Eligible) | O is universal donor; lower clinical urgency. |

---

### ❤️ Category 3: Heart Allocation (Donor: Sneha Patil, Blood B)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Arjun Das** | Heart | B | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Critical cardiac failure, identical B match. |
| **Lakshmi Iyer** | Heart | B | 3 (Moderate) | **Compatible** ✅ | **210** | Ranked #2 (Eligible) | Same blood group B, lower urgency score. |
| **Rohan Gupta** | Heart | A | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Blood type A cannot accept B heart. |

---

### 👁️ Category 4: Cornea Allocation (Donor: Meera Joshi, Blood A)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Pooja Hegde** | Cornea | A | 4 (High) | **Compatible** ✅ | **280** | 🏆 **RECOMMENDED MATCH** | High urgency ocular trauma, identical A match. |
| **Vikram Malhotra** | Cornea | B | 3 (Moderate) | **Incompatible** ❌ | **0** | Disqualified | Blood B incompatible with A donor. |

---

### 🫁 Category 5: Rare Blood & Organ Mismatches (Edge Case Testing)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Expected Result | Edge Case Validated |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Neha Kapoor** | Kidney | AB | 5 (Critical) | **Compatible** with Amitabh Sen (AB) | Matches Donor D4 | AB universal recipient scenario. |
| **Farhan Khan** | Kidney | O | 3 (Moderate) | **Incompatible** with Amitabh Sen (AB) | Disqualified (`Score: 0`) | AB donor cannot donate to O patient. |
| **Sunita Menon** | Lung | O | 4 (High) | Awaiting Lung Donor | Queued on Waitlist | Correctly remains unmatched until lung arrives. |
