//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Tickets is Ownable, VRFConsumerBase {
    constructor(
        address vrfCoordinator_,
        address link_,
        bytes32 keyHash_,
        uint256 fee_,

        uint128 ticketPrice_,
        uint128 prize_,
        uint16 qtyOfTicketsToSell_,
        uint16 qtyOfEarlyBirds_,
        uint8 qtyOfWinners_
    )
    VRFConsumerBase(
        vrfCoordinator_, link_
    )
     {
         _keyHash = keyHash_;
         _fee = fee_;

        setTicketPrice(ticketPrice_);
        setPrize(prize_);
        setQtyOfTicketsToSell(qtyOfTicketsToSell_);
        setQtyOfEarlyBirds(qtyOfEarlyBirds_);
        setQtyOfWinners(qtyOfWinners_);
    }

    // Chainlink VRF
    bytes32 private _keyHash;
    uint256 private _fee;

    // Configurables
    uint128 public ticketPrice; // wei
    uint128 public prize; // wei to be split between qtyOfWinners
    uint16 public qtyOfTicketsToSell; // round ends when this number of tickets is sold
    uint16 public qtyOfEarlyBirds; // initial entrants to receive bonus ticket upon purchase
    uint16 public qtyOfWinners; // quantity of entrants to split prize

    struct EntrantLatestDetails {
        uint16 latestRound;
        uint16 numOfTicketsOwned; // sold & bonus tickets
    }

    mapping(address => EntrantLatestDetails) private entrantDetails; // entrant => latest round participated, num of tickets
    mapping(uint16 => address) public ticketToOwner; // contains sold & bonus tickets //TODO revert public => private
    mapping(uint16 => address[]) private roundToWinners; // contains each round's winners (starts at 1)
    uint16 public soldTickets = 0;
    uint16 public bonusTickets = 0; // obtained through referring or early bird purchases
    uint16 public totalTickets = 0;
    uint16 public currentRound = 1;
    uint16 public qtyOfEntrants = 0;
    bool public roundResetInProcess = false;

    function getEntrantNumOfTickets(address entrantAddress) external view returns (uint16) {
        uint16 latestRound = entrantDetails[entrantAddress].latestRound;
        uint16 numOfTicketsOwned = entrantDetails[entrantAddress].numOfTicketsOwned;
        if (latestRound < currentRound) {
            return 0;
        } else {
            return numOfTicketsOwned;
        }
    }

    function setTicketPrice(uint128 newTicketPrice) public onlyOwner {
        ticketPrice = newTicketPrice;
    }

    function setPrize(uint128 newPrize) public onlyOwner {
        require(roundResetInProcess == false, "Round is currently resetting");
        prize = newPrize;
    }

    function setQtyOfTicketsToSell(uint16 newQtyOfTicketsToSell)
        public
        onlyOwner
    {
        require(newQtyOfTicketsToSell >= 1, "Must be at least 1");
        qtyOfTicketsToSell = newQtyOfTicketsToSell;
    }

    function setQtyOfEarlyBirds(uint16 newQtyOfEarlyBirds) public onlyOwner {
        require(newQtyOfEarlyBirds <= qtyOfTicketsToSell, "Cannot be higher than qtyOfTicketsToSell");
        qtyOfEarlyBirds = newQtyOfEarlyBirds;
    }

    function setQtyOfWinners(uint16 newQtyOfWinners) public onlyOwner {
        require(newQtyOfWinners >= 1, "Must be at least 1");
        require(roundResetInProcess == false, "Round is currently resetting");
        qtyOfWinners = newQtyOfWinners;
    }

    function buyTicket() external payable buyTicketModifier {
        _buyTicket();
    }

    function buyTicketWithReferral(address referrer)
        external
        payable
        buyTicketModifier
    {
        if (entrantDetails[referrer].latestRound == currentRound) {
            bonusTickets += 1;
            entrantDetails[referrer].numOfTicketsOwned += 1;
        } // else transaction continues without referral bonus

        _buyTicket();
    }

    modifier buyTicketModifier() {
        require(msg.value == ticketPrice, "Value does not match ticket price");
        require(roundResetInProcess == false, "Round is currently resetting");
        require(soldTickets < qtyOfTicketsToSell, "Round's tickets sold out");
        _;
    }

    function _buyTicket() private {
        soldTickets += 1;
        ticketToOwner[(soldTickets - 1) + bonusTickets] = msg.sender;
// console.log("(soldTickets - 1) + bonusTickets:", (soldTickets - 1) + bonusTickets);

        if (soldTickets <= qtyOfEarlyBirds) { // early bird
            bonusTickets += 1;
            totalTickets += 2;
            ticketToOwner[(bonusTickets - 1) + soldTickets] = msg.sender;
// console.log("(bonusTickets - 1) + soldTickets:", (bonusTickets - 1) + soldTickets);
            entrantDetails[msg.sender].numOfTicketsOwned += 2;
        } else {
            totalTickets += 1;
            entrantDetails[msg.sender].numOfTicketsOwned += 1;
        }

        if (entrantDetails[msg.sender].latestRound != currentRound) {
            entrantDetails[msg.sender].latestRound = currentRound;
            qtyOfEntrants++;
        }

        if (soldTickets >= qtyOfTicketsToSell) {
            _endOfRound();
        }
    }

    function withdraw() external onlyOwner {
        int256 surplus = int256(address(this).balance - prize);
        require(surplus > 0, "Insufficient balance");
        (bool success, ) = owner().call{value: uint256(surplus)}("");
        require(success, "Unsuccessful transfer");
    }

    function withdrawLink(uint256 amount) external onlyOwner {
        //TODO probaby not all. maybe change above name to withdrawSurplus. maybe check
    }

    function _endOfRound() private {
        require(LINK.balanceOf(address(this)) >= _fee, "Unable to reset round: insufficient LINK");
        roundResetInProcess = true;
        requestRandomness(_keyHash, _fee);
    }

    function _getRandomTicketNumber(
        uint256 randomValue,
        uint16 nonce
    ) private view returns (uint16) {
console.log(">>>totalTickets:", totalTickets);
        uint16 selectedRandomIndex = uint16(uint256(keccak256(abi.encode(randomValue, nonce))) % totalTickets);
console.log(">>>selectedRandomIndex:", selectedRandomIndex);
// console.log(">>>selectedRandomIndex:", selectedRandomIndex);
// console.log(">>>ticketToOwner[selectedRandomIndex]:", ticketToOwner[selectedRandomIndex]);
// console.log("0:", ticketToOwner[0]);
// console.log("1:", ticketToOwner[1]);
// console.log("2:", ticketToOwner[2]);
// console.log("3:", ticketToOwner[3]);
// console.log("4:", ticketToOwner[4]);
// console.log("5:", ticketToOwner[5]);
// console.log("6:", ticketToOwner[6]);
// console.log("7:", ticketToOwner[7]);
// console.log("8:", ticketToOwner[8]);
// console.log("9:", ticketToOwner[9]);
// console.log("10:", ticketToOwner[10]);
// console.log("11:", ticketToOwner[11]);
// console.log("12:", ticketToOwner[12]);
        return selectedRandomIndex;
    }

    function _checkForDuplicateWinner(
        uint256 randomness,
        address winnerAddress,
        address[] memory winnerSelection,
        uint16 qtyOfWinnersIndex
    ) private returns (address) {
        bool duplicateFound = false;
        for (uint16 j = 0; j < qtyOfWinnersIndex; j++) {
            if (winnerAddress == winnerSelection[j]) {
                uint16 winnerIndex = _getRandomTicketNumber(randomness, qtyOfWinnersIndex);
                duplicateFound = true;

                // Removing the winner from the pool
                ticketToOwner[winnerIndex] = ticketToOwner[totalTickets - 1];
                totalTickets--;

                break;
            }
        }
        if (duplicateFound == true) {
            return _checkForDuplicateWinner(
                randomness,
                winnerAddress,
                winnerSelection,
                qtyOfWinnersIndex
            );
        } else {
            return winnerAddress;
        }
    }

    function _distributePrize(uint16 roundToWinnersLength) private {
        uint256 prizeEach = prize / roundToWinnersLength;
        for (uint16 i = 0; i < roundToWinnersLength; i++) {
console.log("winnerSelection:", roundToWinners[currentRound][i], "i:", i);
            (bool success, ) = roundToWinners[currentRound][i].call{value: uint256(prizeEach)}("");
            // require(success, "Unsuccessful transfer");
        }
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override { //TODO ensure doesn't use 200k gas @1100
        roundResetInProcess = false;
        uint16 roundToWinnersLength = 0;

// address[] memory winnerSelection;

        if (qtyOfEntrants < qtyOfWinners) qtyOfWinners = qtyOfEntrants;

        for (uint16 i = 0; i < qtyOfWinners; i++) {
console.log("Inside loop, i:", i);
            uint16 winnerIndex = _getRandomTicketNumber(randomness, i);
            address winnerAddress = ticketToOwner[winnerIndex];
            roundToWinners[currentRound].push(winnerAddress);
            roundToWinnersLength++;
console.log("orig winner: winnerAddress:", winnerAddress);
// console.log("orig winner: roundToWinners[currentRound][i]", roundToWinners[currentRound][i]);
            // Removing the winner from the pool
            ticketToOwner[winnerIndex] = ticketToOwner[totalTickets - 1];
            totalTickets--;

            // Repeat winner check
            if (i > 0) {
                roundToWinners[currentRound][i] = _checkForDuplicateWinner(randomness, winnerAddress, roundToWinners[currentRound], i);
            }
        }

        _distributePrize(roundToWinnersLength);
        _resetRound();
    }

    function _resetRound() private {
        currentRound++;
        soldTickets = 0;
        bonusTickets = 0;
        totalTickets = 0;
        qtyOfEntrants = 0;
    }
}
