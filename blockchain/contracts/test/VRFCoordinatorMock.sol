// //SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.4;

// import "hardhat/console.sol";
// import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
// import "../Tickets.sol";

// contract MockVRF is Tickets {
// function rawFulfillRandomness(bytes32 requestId, uint256 randomness) external {
//     require(msg.sender == vrfCoordinator, "Only VRFCoordinator can fulfill");
//     fulfillRandomness(requestId, randomness);
//   }
// }