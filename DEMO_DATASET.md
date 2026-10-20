# OrganChain — Hospital Benchmark Dataset (33 Cases)

This clinical benchmark dataset models multi-organ allocation across **Kidney**, **Liver**, **Heart**, **Lung**, **Pancreas**, and **Cornea** under Algorithm 1.

---

## 1. Registered & Verified Donors (10 Total Donors)

| # | Donor Name | Organ Pledged | Blood Group | Verification Status | Biological Match Characteristics |
|:---:|:---|:---:|:---:|:---:|:---|
| **D1** | **Ravi Kumar** | **Kidney** | **A** | Verified ✅ | Compatible with A and AB patients |
| **D2** | **Deepak Verma** | **Liver** | **O** | Verified ✅ | **Universal Donor** (Compatible with O, A, B, AB) |
| **D3** | **Sneha Patil** | **Heart** | **B** | Verified ✅ | Compatible with B and AB patients |
| **D4** | **Amitabh Sen** | **Kidney** | **AB** | Verified ✅ | Compatible only with AB recipients |
| **D5** | **Meera Joshi** | **Cornea** | **A** | Verified ✅ | Compatible with A and AB patients |
| **D6** | **Anil Kapoor** | **Lung** | **O** | Verified ✅ | **Universal Donor for Lungs** |
| **D7** | **Divya Deshmukh** | **Pancreas** | **A** | Verified ✅ | Compatible with A and AB recipients |
| **D8** | **Harish Mehta** | **Kidney** | **B** | Verified ✅ | Compatible with B and AB recipients |

---

## 2. Recipient Waitlist & Multi-Organ Allocation Cases (23 Total Patients)

Algorithm 1 Priority Score:
$$\text{Score} = (70 \times \text{Urgency}) + (30 \times \text{Waiting Days})$$

### 🫁 Category 1: Lung Allocation (Donor: Anil Kapoor, Universal Blood O)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Ritu Sharma** | Lung | O | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | End-stage pulmonary failure, perfect O-O match. |
| **Sunita Menon** | Lung | O | 4 (High) | **Compatible** ✅ | **280** | Ranked #2 (Eligible) | High urgency, O match. |
| **Karthik Subbaraj** | Lung | B | 3 (Moderate) | **Compatible** ✅ | **210** | Ranked #3 (Eligible) | O is universal donor; lower clinical urgency. |

---

### 🩺 Category 2: Pancreas Allocation (Donor: Divya Deshmukh, Blood A)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Ayesha Siddiqui** | Pancreas | A | 4 (High) | **Compatible** ✅ | **280** | 🏆 **RECOMMENDED MATCH** | Severe diabetic organ failure, identical blood A. |
| **Nikhil Chinappa** | Pancreas | B | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Blood group B cannot accept type A pancreas. |

---

### 🫘 Category 3: Kidney Allocation (Donor: Harish Mehta, Blood B)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Sameer Joshi** | Kidney | B | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Stage-5 CKD, identical B match. |
| **Geeta Phogat** | Kidney | AB | 4 (High) | **Compatible** ✅ | **280** | Ranked #2 (Eligible) | AB universal recipient scenario. |
| **Rahul Sharma** | Kidney | A | 5 (Critical) | **Incompatible** ❌ | **0** | Disqualified | Blood group A incompatible with B kidney. |
| **Farhan Khan** | Kidney | O | 3 (Moderate) | **Incompatible** ❌ | **0** | Disqualified | Type O cannot accept B donor. |

---

### 🫀 Category 4: Liver Allocation (Donor: Deepak Verma, Universal Blood O)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Siddharth Roy** | Liver | O | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Critical end-stage liver disease, identical O match. |
| **Kavita Reddy** | Liver | A | 4 (High) | **Compatible** ✅ | **280** | Ranked #2 (Eligible) | O is universal donor; compatible with type A. |
| **Manoj Tiwari** | Liver | B | 2 (Stable) | **Compatible** ✅ | **140** | Ranked #3 (Eligible) | O is universal donor; lower clinical urgency. |

---

### ❤️ Category 5: Heart Allocation (Donor: Sneha Patil, Blood B)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Arjun Das** | Heart | B | 5 (Critical) | **Compatible** ✅ | **350** | 🏆 **RECOMMENDED MATCH** | Critical cardiac failure, identical B match. |
| **Lakshmi Iyer** | Heart | B | 3 (Moderate) | **Compatible** ✅ | **210** | Ranked #2 (Eligible) | Same blood group B, lower urgency score. |
| **Rohan Gupta** | Heart | A | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Blood type A cannot accept B heart. |
| **Tarun Tahiliani** | Heart | O | 4 (High) | **Incompatible** ❌ | **0** | Disqualified | Type O cannot accept B heart. |

---

### 👁️ Category 6: Cornea Allocation (Donor: Meera Joshi, Blood A)
| Patient | Organ Needed | Blood | Urgency | Compatibility | Score | Expected Match Result | Medical Rationale |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Pooja Hegde** | Cornea | A | 4 (High) | **Compatible** ✅ | **280** | 🏆 **RECOMMENDED MATCH** | High urgency ocular trauma, identical A match. |
| **Vikram Malhotra** | Cornea | B | 3 (Moderate) | **Incompatible** ❌ | **0** | Disqualified | Blood B incompatible with A donor. |
