const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, 11155111, { staticNetwork: true });
  const admin = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contractAddr = "0xdF1d9270175c1459250C59c956265c355FBd38b2";

  const abi = [
    "function registerDonor(string name, string bloodGroup, string organ, string docHash)",
    "function verifyDonor(address donorAddr)",
    "function registerPatient(string name, uint256 urgency, string bloodGroup, string organ)"
  ];
  const adminContract = new ethers.Contract(contractAddr, abi, admin);

  console.log("Admin address:", admin.address);
  let adminNonce = await provider.getTransactionCount(admin.address, "latest");
  console.log("Current admin nonce:", adminNonce);

  const donors = [
    { name: "Anil Kapoor", organ: "Lung", blood: "O", doc: "bafybeianilreport" },
    { name: "Divya Deshmukh", organ: "Pancreas", blood: "A", doc: "bafybeidivyareport" },
    { name: "Harish Mehta", organ: "Kidney", blood: "B", doc: "bafybeiharishreport" }
  ];

  const patients = [
    { name: "Ritu Sharma", organ: "Lung", blood: "O", urgency: 5 },
    { name: "Karthik Subbaraj", organ: "Lung", blood: "B", urgency: 3 },
    { name: "Ayesha Siddiqui", organ: "Pancreas", blood: "A", urgency: 4 },
    { name: "Nikhil Chinappa", organ: "Pancreas", blood: "B", urgency: 4 },
    { name: "Sameer Joshi", organ: "Kidney", blood: "B", urgency: 5 },
    { name: "Geeta Phogat", organ: "Kidney", blood: "AB", urgency: 4 },
    { name: "Tarun Tahiliani", organ: "Heart", blood: "O", urgency: 4 }
  ];

  console.log(`\n=== 1. Seeding ${donors.length} Additional Donors ===`);
  for (const d of donors) {
    const w = ethers.Wallet.createRandom().connect(provider);
    console.log(`Creating donor: ${d.name} (${d.organ}, ${d.blood}) at ${w.address}`);

    const fundTx = await admin.sendTransaction({
      to: w.address,
      value: ethers.parseEther("0.0025"),
      nonce: adminNonce++
    });
    await fundTx.wait();

    const donorContract = new ethers.Contract(contractAddr, abi, w);
    const regTx = await donorContract.registerDonor(d.name, d.blood, d.organ, d.doc);
    await regTx.wait();

    const verifyTx = await adminContract.verifyDonor(w.address, { nonce: adminNonce++ });
    await verifyTx.wait();
    console.log(`Verified donor: ${d.name}`);
  }

  console.log(`\n=== 2. Seeding ${patients.length} Additional Patients ===`);
  for (const p of patients) {
    const w = ethers.Wallet.createRandom().connect(provider);
    console.log(`Creating patient: ${p.name} (${p.organ}, ${p.blood}, Urgency: ${p.urgency}) at ${w.address}`);

    const fundTx = await admin.sendTransaction({
      to: w.address,
      value: ethers.parseEther("0.0025"),
      nonce: adminNonce++
    });
    await fundTx.wait();

    const patContract = new ethers.Contract(contractAddr, abi, w);
    const regTx = await patContract.registerPatient(p.name, p.urgency, p.blood, p.organ);
    await regTx.wait();
    console.log(`Registered patient: ${p.name}`);
  }

  console.log("\n All 10 extra records seeded successfully on Sepolia!");
}

main().catch(console.error);
