const hre = require("hardhat");
const { entryPointAddress } = require("../addressesConfig");
const { updateAddressesConfig } = require("./helpers/updateAddressesConfig");

async function main() {
  const requiredApprovals = 2;

  const AccountFactory2 = await hre.ethers.deployContract("AccountFactory2", [
    entryPointAddress,
    requiredApprovals,
  ]);

  await AccountFactory2.waitForDeployment();

  console.log(`AccountFactory deployed to ${AccountFactory2.target}`);

  updateAddressesConfig("accountFactoryAddress", AccountFactory2.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
