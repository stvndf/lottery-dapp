//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

contract Tickets {

    constructor(uint128 _ticketPrice, uint128 _prize, uint16 _numOfEarlyBirds, uint16 _numOfTicketsToSell, uint8 _numOfWinners) {
        ticketPrice = _ticketPrice;
        prize = _prize;
        numOfEarlyBirds = _numOfEarlyBirds;
        numOfTicketsToSell = _numOfTicketsToSell;
        numOfWinners = _numOfWinners;
    }

    // Configurables
    uint128 public ticketPrice; // wei
    uint128 public prize; // wei to be split between numOfWinners
    uint16 public numOfEarlyBirds; // initial entrants to receive bonus ticket upon purchase
    uint16 public numOfTicketsToSell; // round ends when this number is sold
    uint8 public numOfWinners; // number of entrants to split prize

    struct EntrantLatestDetails {
        uint16 latestRound;
        uint16 numOfTicketsOwned; // sold & bonus tickets
    }

    mapping(address => EntrantLatestDetails) private entrantDetails; // entrant => latest round participated, num of tickets
    mapping(uint16 => address) private ticketToOwner; // contains sold & bonus tickets
    uint16 public soldTickets = 0;
    uint16 public bonusTickets = 0;
    uint16 public currentRound = 1;

    function t() public {
        EntrantLatestDetails storage entrantLatestDetails = entrantDetails[msg.sender];
        entrantLatestDetails.latestRound = 1;
        entrantLatestDetails.numOfTicketsOwned = 123;
    }

    function getEntrantNumOfTickets() public view returns(uint16) {
        uint16 latestRound = entrantDetails[msg.sender].latestRound;
        uint16 numOfTicketsOwned = entrantDetails[msg.sender].numOfTicketsOwned;
        if (latestRound < currentRound) {
            return 0;
        } else {
            return numOfTicketsOwned;
        }
    }

}
