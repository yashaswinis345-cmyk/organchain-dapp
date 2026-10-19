const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrganTransplant", function () {
  let contract, owner, hospital2, donor1, donor2, patient1, patient2, stranger;

  beforeEach(async function () {
    [owner, hospital2, donor1, donor2, patient1, patient2, stranger] =
      await ethers.getSigners();

    const OrganTransplant = await ethers.getContractFactory("OrganTransplant");
    contract = await OrganTransplant.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets the deployer as owner and first verified hospital", async function () {
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.isHospital(owner.address)).to.equal(true);
      const info = await contract.hospitalInfo(owner.address);
      expect(info.status).to.equal(2n); // HospitalStatus.Verified
    });
  });

  describe("Hospital application and governance", function () {
    it("lets anyone apply as a pending hospital", async function () {
      await expect(contract.connect(hospital2).applyAsHospital("Apollo Hospital", "Bengaluru"))
        .to.emit(contract, "HospitalApplied")
        .withArgs(hospital2.address, "Apollo Hospital", "Bengaluru");

      const info = await contract.hospitalInfo(hospital2.address);
      expect(info.status).to.equal(1n); // Pending
      expect(await contract.isHospital(hospital2.address)).to.equal(false);
    });

    it("lets the owner authorize a pending applicant", async function () {
      await contract.connect(hospital2).applyAsHospital("Apollo Hospital", "Bengaluru");
      await expect(contract.authorizeHospital(hospital2.address, "", ""))
        .to.emit(contract, "HospitalAuthorized")
        .withArgs(hospital2.address);

      expect(await contract.isHospital(hospital2.address)).to.equal(true);
      const info = await contract.hospitalInfo(hospital2.address);
      expect(info.status).to.equal(2n); // Verified
      expect(info.name).to.equal("Apollo Hospital");
    });

    it("lets the owner directly authorize a brand-new hospital in one step", async function () {
      await contract.authorizeHospital(hospital2.address, "Manipal Hospital", "Bengaluru");
      expect(await contract.isHospital(hospital2.address)).to.equal(true);
      const info = await contract.hospitalInfo(hospital2.address);
      expect(info.name).to.equal("Manipal Hospital");
    });

    it("lets the owner reject a pending applicant", async function () {
      await contract.connect(hospital2).applyAsHospital("Fortis Hospital", "Mumbai");
      await expect(contract.rejectHospital(hospital2.address))
        .to.emit(contract, "HospitalRejected")
        .withArgs(hospital2.address);

      expect(await contract.isHospital(hospital2.address)).to.equal(false);
      const info = await contract.hospitalInfo(hospital2.address);
      expect(info.status).to.equal(3n); // Rejected
    });

    it("rejects hospital authorization from a non-owner", async function () {
      await expect(
        contract.connect(stranger).authorizeHospital(hospital2.address, "X", "Y")
      ).to.be.revertedWith("Not contract owner");
    });

    it("lists all hospital addresses that have applied or been authorized", async function () {
      await contract.connect(hospital2).applyAsHospital("Apollo Hospital", "Bengaluru");
      const addrs = await contract.getHospitalAddresses();
      expect(addrs).to.include(owner.address);
      expect(addrs).to.include(hospital2.address);
    });
  });

  describe("Donor registration", function () {
    it("registers a donor and stores correct data", async function () {
      await expect(
        contract.connect(donor1).registerDonor("Alice Donor", "O", "Kidney", "QmDummyCID1")
      )
        .to.emit(contract, "DonorRegistered")
        .withArgs(donor1.address, "Kidney", "O");

      const d = await contract.donors(donor1.address);
      expect(d.name).to.equal("Alice Donor");
      expect(d.isVerified).to.equal(false);
      expect(d.exists).to.equal(true);
    });

    it("prevents double registration", async function () {
      await contract.connect(donor1).registerDonor("Alice", "O", "Kidney", "cid1");
      await expect(
        contract.connect(donor1).registerDonor("Alice Again", "O", "Kidney", "cid2")
      ).to.be.revertedWith("Donor already registered");
    });

    it("only an authorized hospital can verify a donor", async function () {
      await contract.connect(donor1).registerDonor("Alice", "O", "Kidney", "cid1");
      await expect(
        contract.connect(stranger).verifyDonor(donor1.address)
      ).to.be.revertedWith("Not an authorized hospital");

      await contract.verifyDonor(donor1.address); // owner is a hospital
      const d = await contract.donors(donor1.address);
      expect(d.isVerified).to.equal(true);
    });
  });

  describe("Patient registration", function () {
    it("registers a patient with valid urgency", async function () {
      await expect(
        contract.connect(patient1).registerPatient("Bob Patient", 5, "AB", "Kidney")
      )
        .to.emit(contract, "PatientRegistered")
        .withArgs(patient1.address, "Kidney", "AB", 5);
    });

    it("rejects urgency outside 1-5", async function () {
      await expect(
        contract.connect(patient1).registerPatient("Bob", 9, "AB", "Kidney")
      ).to.be.revertedWith("Urgency must be 1-5");
    });
  });

  describe("previewScore + automatic matching (Algorithm 1)", function () {
    beforeEach(async function () {
      await contract.connect(donor1).registerDonor("Donor A", "O", "Kidney", "cidA");
      await contract.connect(donor2).registerDonor("Donor B", "O", "Kidney", "cidB");
      await contract.verifyDonor(donor1.address);
      await contract.verifyDonor(donor2.address);
    });

    it("previewScore reports ineligible pairs as not eligible", async function () {
      await contract.connect(patient1).registerPatient("Patient A-type", 5, "A", "Liver");
      const [eligible] = await contract.previewScore(donor1.address, patient1.address);
      expect(eligible).to.equal(false); // organ mismatch
    });

    it("findMatch picks an eligible, verified, compatible donor", async function () {
      await contract.connect(patient1).registerPatient("Patient AB", 5, "AB", "Kidney");
      const tx = await contract.findMatch(patient1.address);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } })
        .find((e) => e && e.name === "MatchFound");

      expect(event).to.not.be.undefined;
      expect([donor1.address, donor2.address]).to.include(event.args.donorAddr);

      const patient = await contract.patients(patient1.address);
      expect(patient.isMatched).to.equal(true);
    });

    it("reverts when no eligible donor exists", async function () {
      await contract.connect(stranger).registerDonor("Donor A-type", "A", "Liver", "cidC");
      await contract.verifyDonor(stranger.address);
      await contract.connect(patient1).registerPatient("Patient B-type", 5, "B", "Liver");
      await expect(contract.findMatch(patient1.address)).to.be.revertedWith(
        "No eligible donor found"
      );
    });

    it("only an authorized hospital can trigger matching", async function () {
      await contract.connect(patient1).registerPatient("Patient", 5, "O", "Kidney");
      await expect(
        contract.connect(stranger).findMatch(patient1.address)
      ).to.be.revertedWith("Not an authorized hospital");
    });
  });

  describe("Explicit hospital-selected matching", function () {
    it("matchDonorToPatient pairs a specific donor and patient", async function () {
      await contract.connect(donor1).registerDonor("Donor", "O", "Heart", "cid1");
      await contract.verifyDonor(donor1.address);
      await contract.connect(patient1).registerPatient("Patient", 5, "O", "Heart");

      await expect(contract.matchDonorToPatient(donor1.address, patient1.address))
        .to.emit(contract, "MatchFound")
        .withArgs(donor1.address, patient1.address, 350n); // w1(70)*urgency(5)=350, wait~0

      expect(await contract.getMatchCount()).to.equal(1);
    });

    it("rejects an explicit pairing that is not eligible", async function () {
      await contract.connect(donor1).registerDonor("Donor", "A", "Liver", "cid1");
      await contract.verifyDonor(donor1.address);
      await contract.connect(patient1).registerPatient("Patient", 5, "B", "Liver");

      await expect(
        contract.matchDonorToPatient(donor1.address, patient1.address)
      ).to.be.revertedWith("Not an eligible pair");
    });
  });

  describe("Match confirmation (Fig. 2 final step)", function () {
    it("records and confirms a match", async function () {
      await contract.connect(donor1).registerDonor("Donor", "O", "Heart", "cid1");
      await contract.verifyDonor(donor1.address);
      await contract.connect(patient1).registerPatient("Patient", 5, "O", "Heart");
      await contract.findMatch(patient1.address);

      expect(await contract.getMatchCount()).to.equal(1);
      await expect(contract.confirmMatch(0))
        .to.emit(contract, "MatchConfirmed")
        .withArgs(donor1.address, patient1.address, owner.address);

      const record = await contract.getMatchRecord(0);
      expect(record.confirmed).to.equal(true);
    });
  });

  describe("View functions", function () {
    it("returns full donor and patient lists", async function () {
      await contract.connect(donor1).registerDonor("D1", "O", "Kidney", "cid1");
      await contract.connect(patient1).registerPatient("P1", 2, "O", "Kidney");

      expect(await contract.getDonorList()).to.include(donor1.address);
      expect(await contract.getPatientList()).to.include(patient1.address);
    });
  });
});
