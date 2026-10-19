// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OrganTransplant
/// @notice Decentralized donor-recipient registration, hospital verification,
///         and rule-based matching, implementing Algorithm 1 (weighted
///         urgency + waiting-time scoring) from "Blockchain-Based Organ
///         Transplantation: A Decentralized Framework for Secure
///         Donor-Recipient Management Using Ethereum Smart Contracts and IPFS".
contract OrganTransplant {
    address public owner;

    // ------------------------------------------------------------
    // Donor / Patient data model
    // ------------------------------------------------------------

    struct Donor {
        string name;
        string bloodGroup;
        string organ;
        string docHash;    // IPFS CID of supporting medical document
        bool isVerified;
        bool isMatched;
        bool exists;
    }

    struct Patient {
        string name;
        uint256 urgency;   // 1 (stable) - 5 (critical)
        string bloodGroup;
        string organ;
        uint256 waitStart; // registration timestamp
        bool isMatched;
        bool exists;
    }

    mapping(address => Donor) public donors;
    mapping(address => Patient) public patients;
    address[] private donorList;
    address[] private patientList;

    // ------------------------------------------------------------
    // Hospital verification workflow
    // ------------------------------------------------------------

    enum HospitalStatus { None, Pending, Verified, Rejected }

    struct HospitalInfo {
        string name;
        string location;
        HospitalStatus status;
        uint256 appliedAt;
        uint256 decidedAt;
    }

    mapping(address => HospitalInfo) public hospitalInfo;
    mapping(address => bool) public isHospital; // true only while status == Verified
    address[] private hospitalAddresses;

    // ------------------------------------------------------------
    // Match ledger
    // ------------------------------------------------------------

    struct MatchRecord {
        address donorAddr;
        address patientAddr;
        uint256 timestamp;
        bool confirmed;
        address confirmedBy;
    }

    MatchRecord[] private matchRecords;

    // Matching weights (must sum to 100), tunable only by governance (owner).
    uint256 public w1 = 70; // urgency weight
    uint256 public w2 = 30; // waiting-time weight

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------

    event DonorRegistered(address indexed donorAddr, string organ, string bloodGroup);
    event DonorVerified(address indexed donorAddr, address indexed hospital);
    event PatientRegistered(address indexed patientAddr, string organ, string bloodGroup, uint256 urgency);
    event HospitalApplied(address indexed hospital, string name, string location);
    event HospitalAuthorized(address indexed hospital);
    event HospitalRejected(address indexed hospital);
    event MatchFound(address indexed donorAddr, address indexed patientAddr, uint256 score);
    event MatchConfirmed(address indexed donorAddr, address indexed patientAddr, address indexed hospital);
    event WeightsUpdated(uint256 w1, uint256 w2);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyHospital() {
        require(isHospital[msg.sender], "Not an authorized hospital");
        _;
    }

    constructor() {
        owner = msg.sender;

        // Deployer starts as the first verified hospital/admin.
        hospitalInfo[msg.sender] = HospitalInfo({
            name: "Platform Admin",
            location: "",
            status: HospitalStatus.Verified,
            appliedAt: block.timestamp,
            decidedAt: block.timestamp
        });
        hospitalAddresses.push(msg.sender);
        isHospital[msg.sender] = true;
        emit HospitalAuthorized(msg.sender);
    }

    // ------------------------------------------------------------
    // Hospital application / governance
    // ------------------------------------------------------------

    /// @notice Self-service application; status starts Pending until an
    ///         owner calls authorizeHospital or rejectHospital.
    function applyAsHospital(string calldata name, string calldata location) external {
        require(hospitalInfo[msg.sender].status == HospitalStatus.None, "Already applied");
        require(bytes(name).length > 0, "Name required");

        hospitalInfo[msg.sender] = HospitalInfo({
            name: name,
            location: location,
            status: HospitalStatus.Pending,
            appliedAt: block.timestamp,
            decidedAt: 0
        });
        hospitalAddresses.push(msg.sender);
        emit HospitalApplied(msg.sender, name, location);
    }

    /// @notice Approves a pending applicant, or directly registers + verifies
    ///         a brand-new hospital in one step (pass name/location for a
    ///         fresh address; pass empty strings to keep an applicant's
    ///         existing details).
    function authorizeHospital(address hospitalAddr, string calldata name, string calldata location) external onlyOwner {
        require(hospitalAddr != address(0), "Zero address");
        HospitalInfo storage h = hospitalInfo[hospitalAddr];

        if (h.status == HospitalStatus.None) {
            require(bytes(name).length > 0, "Name required for new hospital");
            hospitalAddresses.push(hospitalAddr);
            h.name = name;
            h.location = location;
            h.appliedAt = block.timestamp;
        } else if (bytes(name).length > 0) {
            h.name = name;
            h.location = location;
        }

        h.status = HospitalStatus.Verified;
        h.decidedAt = block.timestamp;
        isHospital[hospitalAddr] = true;
        emit HospitalAuthorized(hospitalAddr);
    }

    function rejectHospital(address hospitalAddr) external onlyOwner {
        require(hospitalInfo[hospitalAddr].status != HospitalStatus.None, "No such applicant");
        hospitalInfo[hospitalAddr].status = HospitalStatus.Rejected;
        hospitalInfo[hospitalAddr].decidedAt = block.timestamp;
        isHospital[hospitalAddr] = false;
        emit HospitalRejected(hospitalAddr);
    }

    function updateWeights(uint256 _w1, uint256 _w2) external onlyOwner {
        require(_w1 + _w2 == 100, "Weights must sum to 100");
        w1 = _w1;
        w2 = _w2;
        emit WeightsUpdated(_w1, _w2);
    }

    function getHospitalAddresses() external view returns (address[] memory) {
        return hospitalAddresses;
    }

    // ------------------------------------------------------------
    // Donor Onboarding Module
    // ------------------------------------------------------------

    function registerDonor(
        string calldata name,
        string calldata bloodGroup,
        string calldata organ,
        string calldata docHash
    ) external {
        require(!donors[msg.sender].exists, "Donor already registered");
        require(bytes(name).length > 0, "Name required");

        donors[msg.sender] = Donor({
            name: name,
            bloodGroup: bloodGroup,
            organ: organ,
            docHash: docHash,
            isVerified: false,
            isMatched: false,
            exists: true
        });
        donorList.push(msg.sender);
        emit DonorRegistered(msg.sender, organ, bloodGroup);
    }

    function verifyDonor(address donorAddr) external onlyHospital {
        require(donors[donorAddr].exists, "Donor not found");
        donors[donorAddr].isVerified = true;
        emit DonorVerified(donorAddr, msg.sender);
    }

    // ------------------------------------------------------------
    // Recipient Waitlist Module
    // ------------------------------------------------------------

    function registerPatient(
        string calldata name,
        uint256 urgency,
        string calldata bloodGroup,
        string calldata organ
    ) external {
        require(!patients[msg.sender].exists, "Patient already registered");
        require(urgency >= 1 && urgency <= 5, "Urgency must be 1-5");

        patients[msg.sender] = Patient({
            name: name,
            urgency: urgency,
            bloodGroup: bloodGroup,
            organ: organ,
            waitStart: block.timestamp,
            isMatched: false,
            exists: true
        });
        patientList.push(msg.sender);
        emit PatientRegistered(msg.sender, organ, bloodGroup, urgency);
    }

    // ------------------------------------------------------------
    // Matching Logic Module (Algorithm 1)
    // ------------------------------------------------------------

    /// @notice Simplified ABO blood-group compatibility check.
    ///         O is treated as a universal donor; AB as a universal recipient.
    function isCompatible(string memory donorBG, string memory patientBG) public pure returns (bool) {
        bytes32 d = keccak256(bytes(donorBG));
        bytes32 p = keccak256(bytes(patientBG));

        if (d == p) return true;
        if (d == keccak256(bytes("O"))) return true;
        if (p == keccak256(bytes("AB"))) return true;
        return false;
    }

    /// @notice Read-only preview of a specific donor-patient pairing's
    ///         eligibility and score, without committing a match. Used by
    ///         the hospital dashboard to rank eligible patients for a
    ///         chosen donor before approving a match.
    function previewScore(address donorAddr, address patientAddr) public view returns (bool eligible, uint256 score) {
        Donor memory d = donors[donorAddr];
        Patient memory p = patients[patientAddr];

        if (!d.exists || !p.exists || !d.isVerified || d.isMatched || p.isMatched) {
            return (false, 0);
        }
        if (keccak256(bytes(d.organ)) != keccak256(bytes(p.organ))) {
            return (false, 0);
        }
        if (!isCompatible(d.bloodGroup, p.bloodGroup)) {
            return (false, 0);
        }

        uint256 waitingDays = (block.timestamp - p.waitStart) / 1 days;
        uint256 s = (w1 * p.urgency) + (w2 * waitingDays);
        return (true, s);
    }

    /// @notice Executes Algorithm 1 automatically for a given patient:
    ///         filters eligible verified donors, scores by urgency + wait
    ///         time, and commits the argmax as a pending match record.
    function findMatch(address patientAddr) external onlyHospital returns (address bestDonor) {
        require(patients[patientAddr].exists, "Patient not found");
        require(!patients[patientAddr].isMatched, "Patient already matched");

        bool found = false;
        address bestAddr;
        uint256 best;

        for (uint256 i = 0; i < donorList.length; i++) {
            address candidate = donorList[i];
            (bool eligible, uint256 score) = previewScore(candidate, patientAddr);
            if (eligible && (!found || score > best)) {
                found = true;
                best = score;
                bestAddr = candidate;
            }
        }

        require(found, "No eligible donor found");

        donors[bestAddr].isMatched = true;
        patients[patientAddr].isMatched = true;
        matchRecords.push(MatchRecord(bestAddr, patientAddr, block.timestamp, false, address(0)));

        emit MatchFound(bestAddr, patientAddr, best);
        return bestAddr;
    }

    /// @notice Hospital-selected explicit pairing: used when a hospital has
    ///         picked a specific donor and, after reviewing the ranked
    ///         eligible-patient list, approves a specific patient for them.
    function matchDonorToPatient(address donorAddr, address patientAddr) external onlyHospital returns (uint256 matchIndex) {
        (bool eligible, uint256 score) = previewScore(donorAddr, patientAddr);
        require(eligible, "Not an eligible pair");

        donors[donorAddr].isMatched = true;
        patients[patientAddr].isMatched = true;
        matchRecords.push(MatchRecord(donorAddr, patientAddr, block.timestamp, false, address(0)));

        emit MatchFound(donorAddr, patientAddr, score);
        return matchRecords.length - 1;
    }

    /// @notice Final hospital sign-off on a pending match (Fig. 2's
    ///         "hospital confirmation" step).
    function confirmMatch(uint256 matchIndex) external onlyHospital {
        require(matchIndex < matchRecords.length, "Invalid match index");
        require(!matchRecords[matchIndex].confirmed, "Already confirmed");
        matchRecords[matchIndex].confirmed = true;
        matchRecords[matchIndex].confirmedBy = msg.sender;
        emit MatchConfirmed(matchRecords[matchIndex].donorAddr, matchRecords[matchIndex].patientAddr, msg.sender);
    }

    // ------------------------------------------------------------
    // View functions (free / gas-less reads)
    // ------------------------------------------------------------

    function getDonorList() external view returns (address[] memory) {
        return donorList;
    }

    function getPatientList() external view returns (address[] memory) {
        return patientList;
    }

    function getMatchCount() external view returns (uint256) {
        return matchRecords.length;
    }

    function getMatchRecord(uint256 index) external view returns (MatchRecord memory) {
        require(index < matchRecords.length, "Invalid match index");
        return matchRecords[index];
    }
}
