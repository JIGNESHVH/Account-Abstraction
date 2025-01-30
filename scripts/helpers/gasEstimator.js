const Web3 = require('web3');
const https = process.env.PROVIDER;
const web3 = new Web3(https);

require('dotenv').config();

async function priorityFeePerGas() {
  /*************  ✨ Codeium Command ⭐  *************/
  /**
   * Format the output of eth_feeHistory to be used in priorityFeePerGas calculation.
   * @param {Object} result - The result object from eth_feeHistory.
   * @returns {Array} - An array of blocks with associated priority fees.
   */
  /******  e0594b61-8750-446d-8da5-7fae224b7e91  *******/
  function formatFeeHistory(result) {
    let blockNum = Number(result.oldestBlock);
    const blocks = [];
    for (let index = 0; index < result.baseFeePerGas.length; index++) {
      if (result.reward[index]) {
        blocks.push({
          priorityFeePerGas: result.reward[index].map(x => Number(x)),
        });
      }
      blockNum += 1;
    }
    return blocks;
  }

  function avg(arr) {
    const sum = arr.reduce((a, v) => a + v);
    return Math.round(sum / arr.length);
  }

  const feeHistory = await web3.eth.getFeeHistory(20, "pending", [1]);
  const blocks = formatFeeHistory(feeHistory);
  const average = avg(blocks.map(b => b.priorityFeePerGas[0]));
  return average;

}

module.exports = { priorityFeePerGas };
