const hre = require("hardhat");
const { priorityFeePerGas } = require("./helpers/gasEstimator");
const {
  eoaPublicKey,
  eoaPrivateKey,
  multiOwnerAccountAddresses,
  entryPointAddress,
  exampleContractAddress,
  accountFactoryAddress2,
  paymasterAddress,
} = require("../addressesConfig");

async function main() {
  const wallet = new ethers.Wallet(eoaPrivateKey);

  const signer = wallet.connect(hre.ethers.provider);

  const AccountFactory2 = await hre.ethers.getContractAt(
    "AccountFactory2",
    accountFactoryAddress2,
    signer
  );
  const entryPoint = await hre.ethers.getContractAt(
    "EntryPoint",
    entryPointAddress,
    signer
  );
  const simpleAccount = await hre.ethers.getContractAt(
    "SimpleAccount",
    multiOwnerAccountAddresses,
    signer
  );

  const exampleContract = await hre.ethers.getContractAt(
    "exampleContract",
    exampleContractAddress,
    signer
  );

  const balanceWei = await hre.ethers.provider.getBalance(signer.address);
  console.log(`The balance of the signer is: ${balanceWei} Wei`);

  // Excute Mint Smart Contract using EOAS Wallet
  const funcTargetData =
    exampleContract.interface.encodeFunctionData("safeMint");

  const data = simpleAccount.interface.encodeFunctionData("execute", [
    exampleContractAddress,
    0,
    funcTargetData,
  ]);

  let initCode =
    accountFactoryAddress2 +
    AccountFactory2.interface
      .encodeFunctionData("createMultiOwnerAccount", [eoaPublicKey, 0])
      .slice(2);

  console.log("initCode", initCode);

  const code = await hre.ethers.provider.getCode(multiOwnerAccountAddresses);
  console.log("code", code);

  if (code !== "0x") {
    initCode = "0x";
  }

  // console.log('maxPriorityFeePerGas:', await priorityFeePerGas());

  const userOp = {
    sender: multiOwnerAccountAddresses,
    nonce: await entryPoint.getNonce(multiOwnerAccountAddresses, 0),
    initCode: initCode,
    callData: data,
    callGasLimit: "100000",
    verificationGasLimit: "1000000",
    preVerificationGas: "0x10edc8",
    maxFeePerGas: "0x0973e0",
    maxPriorityFeePerGas: "0x10edc8",
    paymasterAndData: paymasterAddress,
    signature: "0x",
  };

  const hash = await entryPoint.getUserOpHash(userOp);

  userOp.signature = await signer.signMessage(hre.ethers.getBytes(hash));

  try {
    const tx = await entryPoint.handleOps([userOp], eoaPublicKey, {
      gasLimit: 2000000,
    });
    const receipt = await tx.wait();
    console.log("Transaction successful:", receipt);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
