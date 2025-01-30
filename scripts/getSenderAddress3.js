const hre = require("hardhat");
const {
  accountFactoryAddress,
  entryPointAddress,
} = require("../addressesConfig");
const { createEOA } = require("./helpers/createEoaWallet");
const { updateAddressesConfig } = require("./helpers/updateAddressesConfig");

async function main() {
  const AccountFactory = await hre.ethers.getContractAt(
    "AccountFactory",
    accountFactoryAddress
  );

  const entryPoint = await hre.ethers.getContractAt(
    "EntryPoint",
    entryPointAddress
  );

  // Array of owners
  const owners = [
    "0x34eE58595153f76A4454Fd0d8db665bDced331F5",
    "0xea2Fe42e772784807C33DF5FD7D25D7021244048",
    "0x9C979133593fd92d17ad88e0898331dCdbEc8a98",
  ]; // Replace with actual addresses
  const salt = 0; // Initial salt, can be incremented for uniqueness

  let createdAccounts = [];

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];

    // Create initCode for each owner
    const initCode =
      accountFactoryAddress +
      AccountFactory.interface
        .encodeFunctionData("createAccount", [owner, salt])
        .slice(2);

    let simpleAccountAddress;
    try {
      // Get the deterministic address using getSenderAddress
      await entryPoint.getSenderAddress(initCode);
    } catch (transaction) {
      // Extract the computed address from the error data
      simpleAccountAddress = "0x" + transaction.data.slice(-40);
    }

    console.log(`Owner: ${owner}, Wallet Address: ${simpleAccountAddress}`);
    createdAccounts.push(simpleAccountAddress);
  }

  // Save the generated accounts to configuration
  // updateAddressesConfig("createdAccounts", createdAccounts);

  console.log("All Wallet Addresses:", createdAccounts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
