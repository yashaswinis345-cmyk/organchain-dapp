const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying OrganTransplant with account:", deployer.address);

  const OrganTransplant = await hre.ethers.getContractFactory("OrganTransplant");
  const contract = await OrganTransplant.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("OrganTransplant deployed to:", address);
  console.log("Deployer set as initial verified hospital (Platform Admin):", deployer.address);
  console.log("\nSave this address into frontend/contract.js as CONTRACT_ADDRESS.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
