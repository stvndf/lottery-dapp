//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Tickets is Ownable {

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
    uint16 public numOfTicketsToSell; // round ends when this number of tickets is sold
    uint8 public numOfWinners; // number of entrants to split prize

    struct EntrantLatestDetails {
        uint16 latestRound;
        uint16 numOfTicketsOwned; // sold & bonus tickets
    }

    mapping(address => EntrantLatestDetails) private entrantDetails; // entrant => latest round participated, num of tickets
    mapping(uint16 => address) private ticketToOwner; // contains sold & bonus tickets
    uint16 public soldTickets = 0;
    uint16 public bonusTickets = 0; // obtained through referring or early bird purchases
    uint16 public currentRound = 1;

    function getEntrantNumOfTickets() external view returns(uint16) {
        uint16 latestRound = entrantDetails[msg.sender].latestRound;
        uint16 numOfTicketsOwned = entrantDetails[msg.sender].numOfTicketsOwned;
        if (latestRound < currentRound) {
            return 0;
        } else {
            return numOfTicketsOwned;
        }
    }

    function setTicketPrice(uint128 newTicketPrice) external onlyOwner {
        ticketPrice = newTicketPrice;
    }
    function setPrize(uint128 newPrize) external onlyOwner {
        prize = newPrize;
    }
    function setNumOfEarlyBirds(uint16 newNumOfEarlyBirds) external onlyOwner {
        numOfEarlyBirds = newNumOfEarlyBirds;
    }
    function setNumOfTicketsToSell(uint16 newNumOfTicketsToSell) external onlyOwner {
        numOfTicketsToSell = newNumOfTicketsToSell;
    }
    function setNumOfWinners(uint8 newNumOfWinners) external onlyOwner {
        numOfWinners = newNumOfWinners;
    }

    function buyTicket() external payable buyTicketModifier {
        _buyTicket();
    }

    function buyTicket(address referrer) external payable buyTicketModifier {
        if (entrantDetails[referrer].latestRound == currentRound) {
            bonusTickets += 1;
            entrantDetails[referrer].numOfTicketsOwned += 1;
        } // else transaction continues without referral bonus

        _buyTicket();
    }

    modifier buyTicketModifier {
        require(msg.value == ticketPrice, "Value does not match ticket price");
        require(soldTickets < numOfTicketsToSell, "Round's tickets sold out");
        _;
    }

    function _buyTicket() private {

        soldTickets += 1;

        if (soldTickets < numOfEarlyBirds) { // early bird
            bonusTickets += 1;
            entrantDetails[msg.sender].numOfTicketsOwned += 2;
        } else {
            entrantDetails[msg.sender].numOfTicketsOwned += 1;
        }

        if (entrantDetails[msg.sender].latestRound != currentRound) {
            entrantDetails[msg.sender].latestRound = currentRound;
        }

        if (soldTickets >= numOfTicketsToSell) {
            _endOfRound();
        }

    }

    function _endOfRound() private {
        // TODO
        // currentRound += 1
        // chainlink VRF to get master rand num
            // get numOfWinners number of rand nums from the master rand num
        // create array (size of numOfWinners)
        // place winner addresses in array (cannot be same winner)
        // iterate over array awarding winners
    }

    function withdraw() external onlyOwner {
        int256 surplus = int256(address(this).balance - prize);
        require(surplus > 0, "Insufficient balance");
        (bool success,) = owner().call{value: uint256(surplus)}("");
        require(success, "Unsuccessful transfer");
    }





}
