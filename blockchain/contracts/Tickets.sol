//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Tickets is Ownable, VRFConsumerBase {
    constructor(
        address _vrfCoordinator,
        address _link,
        uint128 _ticketPrice,
        uint128 _prize,
        uint16 _qtyOfEarlyBirds,
        uint16 _qtyOfTicketsToSell,
        uint8 _qtyOfWinners
    )
    VRFConsumerBase(
        _vrfCoordinator, _link
    )
     {
        ticketPrice = _ticketPrice;
        prize = _prize;
        qtyOfEarlyBirds = _qtyOfEarlyBirds;
        qtyOfTicketsToSell = _qtyOfTicketsToSell;
        qtyOfWinners = _qtyOfWinners;
    }

    // Chainlink VRF
    // keyHash //TODO
    // fee //TODO

    // Configurables
    uint128 public ticketPrice; // wei
    uint128 public prize; // wei to be split between qtyOfWinners
    uint16 public qtyOfEarlyBirds; // initial entrants to receive bonus ticket upon purchase
    uint16 public qtyOfTicketsToSell; // round ends when this number of tickets is sold
    uint8 public qtyOfWinners; // quantity of entrants to split prize

    struct EntrantLatestDetails {
        uint16 latestRound;
        uint16 numOfTicketsOwned; // sold & bonus tickets
    }

    mapping(address => EntrantLatestDetails) private entrantDetails; // entrant => latest round participated, num of tickets
    mapping(uint16 => address) private ticketToOwner; // contains sold & bonus tickets
    uint16 public soldTickets = 0;
    uint16 public bonusTickets = 0; // obtained through referring or early bird purchases
    uint16 public currentRound = 1;
    bool roundResetInProcess = false;

    function getEntrantNumOfTickets() external view returns (uint16) {
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

    function setqtyOfEarlyBirds(uint16 newQtyOfEarlyBirds) external onlyOwner {
        require(newQtyOfEarlyBirds <= qtyOfTicketsToSell, "Cannot be higher than qtyOfTicketsToSell");
        qtyOfEarlyBirds = newQtyOfEarlyBirds;
    }

    function setqtyOfTicketsToSell(uint16 newQtyOfTicketsToSell)
        external
        onlyOwner
    {
        require(newQtyOfTicketsToSell >= 1, "Must be at least 1");
        qtyOfTicketsToSell = newQtyOfTicketsToSell;
    }

    function setqtyOfWinners(uint8 newQtyOfWinners) external onlyOwner {
        require(newQtyOfWinners >= 1, "Must be at least 1");
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
        require(soldTickets < qtyOfTicketsToSell, "Round's tickets sold out");
        require(roundResetInProcess == false, "Round is currently resetting");
        _;
    }

    function _buyTicket() private {
        soldTickets += 1;

        if (soldTickets <= qtyOfEarlyBirds) {
            // early bird
            bonusTickets += 1;
            entrantDetails[msg.sender].numOfTicketsOwned += 2;
        } else {
            entrantDetails[msg.sender].numOfTicketsOwned += 1;
        }

        if (entrantDetails[msg.sender].latestRound != currentRound) {
            entrantDetails[msg.sender].latestRound = currentRound;
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

    function withdrawLink() external onlyOwner {
        //TODO
    }

    function _endOfRound() private {
        roundResetInProcess = true;
        //TODO call VRF
    }

    mapping(address => uint16) winnersSelected;

    function _getRandomTicketNumber(
        uint256 randomValue,
        uint16 nonce1,
        uint16 nonce2
    ) private view returns (uint16) {
        return
            uint16(
                uint256(keccak256(abi.encode(randomValue, nonce1, nonce2))) %
                    (soldTickets + bonusTickets)
            );
    }

    function _checkForDuplicateWinner(
        uint16 i,
        address selectedWinnerAddress,
        address[] memory winnerSelection,
        uint256 randomness,
        uint16 qtyOfTicketsRemaining
    ) private returns (address) {
        bool duplicateFound = false;
        for (uint16 j = 0; j < i; j++) {
            if (selectedWinnerAddress == winnerSelection[j]) {
                uint16 selectedWinnerIndex = _getRandomTicketNumber(
                    randomness,
                    i,
                    j
                );
                selectedWinnerAddress = ticketToOwner[selectedWinnerIndex];
                duplicateFound = true;

                // Removing the winner from the pool
                ticketToOwner[selectedWinnerIndex] = ticketToOwner[
                    qtyOfWinners
                ];
                qtyOfTicketsRemaining--;
                break;
            }
        }
        if (duplicateFound == true) {
            _checkForDuplicateWinner(
                i,
                selectedWinnerAddress,
                winnerSelection,
                randomness,
                qtyOfTicketsRemaining
            );
        } else {
            return selectedWinnerAddress;
        }
    }

    function _distributePrize() private pure {
        //TODO
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override { //TODO ensure doesn't use 200k gas @1100
        roundResetInProcess = false;
        address[] memory winnerSelection = new address[](qtyOfWinners);
        uint16 qtyOfTicketsRemaining = soldTickets + bonusTickets; // decreases as tickets are selected and removed

        for (uint16 i = 0; i < qtyOfWinners; i++) {
            uint16 selectedWinnerIndex = _getRandomTicketNumber(
                randomness,
                i,
                0
            );
            address selectedWinnerAddress = ticketToOwner[selectedWinnerIndex];
            // winnerSelection[i] = ticketToOwner[selectedWinnerIndex];

            // Removing the winner from the pool
            ticketToOwner[selectedWinnerIndex] = ticketToOwner[qtyOfWinners];
            qtyOfTicketsRemaining--;

            selectedWinnerAddress = _checkForDuplicateWinner(
                i,
                selectedWinnerAddress,
                winnerSelection,
                randomness,
                qtyOfTicketsRemaining
            );

            winnerSelection[i] = selectedWinnerAddress;
        }
        //TODO change this to VRF response function
        _distributePrize();
        _resetRound();
    }

    function _resetRound() private {
        currentRound++;
        soldTickets = 0;
        bonusTickets = 0;
    }
}
