// ---------------------------------------------------------------------
// Paste the address printed by `npm run deploy:local` here after deploy.
// ---------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xdF1d9270175c1459250C59c956265c355FBd38b2";

// Hardhat's built-in local network. Change if you deploy elsewhere.
const EXPECTED_CHAIN_ID = 11155111;
const EXPECTED_CHAIN_ID_HEX = "0xaa36a7"; // 11155111 in hex (Sepolia), used for wallet_addEthereumChain

const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function isHospital(address) view returns (bool)",
  "function w1() view returns (uint256)",
  "function w2() view returns (uint256)",

  "function donors(address) view returns (string name, string bloodGroup, string organ, string docHash, bool isVerified, bool isMatched, bool exists)",
  "function patients(address) view returns (string name, uint256 urgency, string bloodGroup, string organ, uint256 waitStart, bool isMatched, bool exists)",
  "function hospitalInfo(address) view returns (string name, string location, uint8 status, uint256 appliedAt, uint256 decidedAt)",

  "function applyAsHospital(string name, string location)",
  "function authorizeHospital(address hospitalAddr, string name, string location)",
  "function rejectHospital(address hospitalAddr)",
  "function updateWeights(uint256 newW1, uint256 newW2)",
  "function getHospitalAddresses() view returns (address[])",

  "function registerDonor(string name, string bloodGroup, string organ, string docHash)",
  "function verifyDonor(address donorAddr)",

  "function registerPatient(string name, uint256 urgency, string bloodGroup, string organ)",

  "function isCompatible(string donorBG, string patientBG) pure returns (bool)",
  "function previewScore(address donorAddr, address patientAddr) view returns (bool eligible, uint256 score)",
  "function findMatch(address patientAddr) returns (address bestDonor)",
  "function matchDonorToPatient(address donorAddr, address patientAddr) returns (uint256 matchIndex)",
  "function confirmMatch(uint256 matchIndex)",

  "function getDonorList() view returns (address[])",
  "function getPatientList() view returns (address[])",
  "function getMatchCount() view returns (uint256)",
  "function getMatchRecord(uint256 index) view returns (tuple(address donorAddr, address patientAddr, uint256 timestamp, bool confirmed, address confirmedBy))",

  "event DonorRegistered(address indexed donorAddr, string organ, string bloodGroup)",
  "event DonorVerified(address indexed donorAddr, address indexed hospital)",
  "event PatientRegistered(address indexed patientAddr, string organ, string bloodGroup, uint256 urgency)",
  "event HospitalApplied(address indexed hospital, string name, string location)",
  "event HospitalAuthorized(address indexed hospital)",
  "event HospitalRejected(address indexed hospital)",
  "event MatchFound(address indexed donorAddr, address indexed patientAddr, uint256 score)",
  "event MatchConfirmed(address indexed donorAddr, address indexed patientAddr, address indexed hospital)",
  "event WeightsUpdated(uint256 w1, uint256 w2)",
];

const BLOOD_GROUPS = ["O", "A", "B", "AB"];
const ORGANS = ["Kidney", "Liver", "Heart", "Lung", "Pancreas", "Cornea"];

// Mirrors the Solidity HospitalStatus enum.
const HOSPITAL_STATUS = ["None", "Pending", "Verified", "Rejected"];
