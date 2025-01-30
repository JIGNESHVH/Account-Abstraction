require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      evmVersion: "shanghai",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/9d456d90ccc5486f909c828f33caef69",
      accounts: [
        "0xd2cbd1d75a65616ccd60025ae49f87a9bf0fe34899f7d6e0d0b38ede181ed397",
      ],
      chainId: 11155111,
    },
    holesky: {
      url: "https://holesky.infura.io/v3/9d456d90ccc5486f909c828f33caef69",
      accounts: [
        "0xd2cbd1d75a65616ccd60025ae49f87a9bf0fe34899f7d6e0d0b38ede181ed397",
      ],
      chainId: 17000,
    },
  },

  etherscan: {
    apiKey: "F55FKIGSTMDVYKTR45RW6WESF35BTZKE6R",
  },
};
