const { ethers } = require("hardhat");

async function main() {
  const DocumentVault = await ethers.getContractFactory("DocumentVault");
  const documentVault = await DocumentVault.deploy();

  await documentVault.deployed();

  console.log("DocumentVault deployed to:", documentVault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });