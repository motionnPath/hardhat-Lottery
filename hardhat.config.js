
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("chai")
require("dotenv").config()


/** @type import('hardhat/config').HardhatUserConfig */

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "";
const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
  
  defaultNetwork:'hardhat',
  networks:{
    hardhat:{
      chainId:31337,
      blockConfirmations:1
    },
    rinkeby:{
      chainId:4,
      blockConfirmations:6,
      url:RINKEBY_RPC_URL,
      accounts:[RINKEBY_PRIVATE_KEY]
    }
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
        rinkeby: ETHERSCAN_API_KEY,
        
    },
},
gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
},
solidity: {
  compilers: [
      {
          version: "0.8.9",
      },
      {
          version: "0.8.8",
      },
  ],
},
  namedAccounts:{
    deployer:{
      default:0,
    },
   
  },
  mocha:{
    timeout:500000, // 500s
  }
};
