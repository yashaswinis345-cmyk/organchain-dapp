const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const admin = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contractAddr = "0xdF1d9270175c1459250C59c956265c355FBd38b2";

  const abi = [
    "function registerDonor(string name, string bloodGroup, string organ, string docHash)",
    "function verifyDonor(address donorAddr)",
    "function registerPatient(string name, uint256 urgency, string bloodGroup, string organ)",
    "function isHospital(address) view returns (bool)"
  ];
  const adminContract = new ethers.Contract(contractAddr, abi, admin);

  console.log("Admin address:", admin.address);
  let adminNonce = await provider.getTransactionCount(admin.address, "latest");
  console.log("Current admin nonce:", adminNonce);

  const donors = [
    { name: "Deepak Verma", organ: "Liver", blood: "O", doc: "bafybeideepakreport" },
    { name: "Sneha Patil", organ: "Heart", blood: "B", doc: "bafybeisnehareport" },
    { name: "Amitabh Sen", organ: "Kidney", blood: "AB", doc: "bafybeiamitabhreport" },
    { name: "Meera Joshi", organ: "Cornea", blood: "A", doc: "bafybeimeerareport" },
  ];

  const patients = [
    { name: "Siddharth Roy", organ: "Liver", blood: "O", urgency: 5 },
    { name: "Kavita Reddy", organ: "Liver", blood: "A", urgency: 4 },
    { name: "Manoj Tiwari", organ: "Liver", blood: "B", urgency: 2 },
    { name: "Arjun Das", organ: "Heart", blood: "B", urgency: 5 },
    { name: "Lakshmi Iyer", organ: "Heart", blood: "B", urgency: 3 },
    { name: "Rohan Gupta", organ: "Heart", blood: "A", urgency: 4 },
    { name: "Neha Kapoor", organ: "Kidney", blood: "AB", urgency: 5 },
    { name: "Farhan Khan", organ: "Kidney", blood: "O", urgency: 3 },
    { name: "Pooja Hegde", organ: "Cornea", blood: "A", urgency: 4 },
    { name: "Vikram Malhotra", organ: "Cornea", blood: "B", urgency: 3 },
    { name: "Sunita Menon", organ: "Lung", blood: "O", urgency: 4 },
  ];

  console.log(`\n=== 1. Seeding ${donors.length} Donors ===`);
  for (const d of donors) {
    const w = ethers.Wallet.createRandom().connect(provider);
    console.log(`Creating donor: ${d.name} (${d.organ}, ${d.blood}) at ${w.address}`);

    const fundTx = await admin.sendTransaction({
      to: w.address,
      value: ethers.parseEther("0.003"),
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

  console.log(`\n=== 2. Seeding ${patients.length} Patients ===`);
  for (const p of patients) {
    const w = ethers.Wallet.createRandom().connect(provider);
    console.log(`Creating patient: ${p.name} (${p.organ}, ${p.blood}, Urgency: ${p.urgency}) at ${w.address}`);

    const fundTx = await admin.sendTransaction({
      to: w.address,
      value: ethers.parseEther("0.003"),
      nonce: adminNonce++
    });
    await fundTx.wait();

    const patContract = new ethers.Contract(contractAddr, abi, w);
    const regTx = await patContract.registerPatient(p.name, p.urgency, p.blood, p.organ);
    await regTx.wait();
    console.log(`Registered patient: ${p.name}`);
  }

  console.log("\n All 15 records seeded successfully on Sepolia!");
}

main().catch(console.error);
