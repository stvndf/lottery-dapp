import "@nomiclabs/hardhat-waffle";
// import "@appliedblockchain/chainlink-plugins-fund-link";
// npx hardhat fund-link --contract <contract address> --linkaddress <link contract address> --fundamount <fund amount>

module.exports = {
  solidity: {
    compilers: [{ version: "0.8.4" }, { version: "0.4.26" }],
  },
};
