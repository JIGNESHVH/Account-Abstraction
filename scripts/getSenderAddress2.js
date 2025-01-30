const hre = require("hardhat");
const {
  accountFactoryAddress2,
  entryPointAddress,
} = require("../addressesConfig");
const { createEOA } = require("./helpers/createEoaWallet");
const { updateAddressesConfig } = require("./helpers/updateAddressesConfig");

async function main() {
  const AccountFactory2 = await hre.ethers.getContractAt(
    "AccountFactory2",
    accountFactoryAddress2
  );

  const entryPoint = await hre.ethers.getContractAt(
    "EntryPoint",
    entryPointAddress
  );

  console.log(entryPoint.target);

  const ownerEOAs = [createEOA(), createEOA(), createEOA()];

  const owners = ownerEOAs.map((eoa) => eoa[0]); // Extract public keys of the owners
  const salt = 1;

  // Generate initCode for multi-owner account
  const initCode =
    accountFactoryAddress2 +
    AccountFactory2.interface
      .encodeFunctionData("createMultiOwnerAccount", [owners, salt])
      .slice(2);
  console.log("initCode", initCode);

  let multiOwnerAccountAddresses;
  try {
    const transaction = await entryPoint.getSenderAddress(initCode);
    console.log("Transaction Revert Data:", transaction);
    // Call getSenderAddress to predict the address
    await entryPoint.getSenderAddress(initCode);
  } catch (transaction) {
    // Handle the transaction data and extract the account addresses
    multiOwnerAccountAddresses = "0x" + transaction.data.slice(-40);
    console.log("multiOwnerAccountAddresses:", multiOwnerAccountAddresses);
  }

  // updateAddressesConfig("eoaPublicKey", owners);
  // updateAddressesConfig("eoaPrivateKey", ownerEOAs);
  // updateAddressesConfig("multiOwnerAccountAddresses", multiOwnerAccountAddresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
