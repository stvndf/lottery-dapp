import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract, ContractFactory, utils } from "ethers";

// function params(
//   ticketPrice: bigint,
//   prize: bigint,
//   qtyOfEarlyBirds: number,
//   qtyOfTicketsToSell: number,
//   qtyOfWinners: number
// ) {
//   const chainlinkParams = {
//     vrfCoordinator: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
//     link: "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255",
//     keyHash:
//       "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4",
//     fee: toWei(0.0001),
//   };
//   return [...Object.values(chainlinkParams), ...arguments];
// }
type Params = {
  vrfCoordinator: string,
  ticketPrice: string,
  prize: string,
  qtyOfEarlyBirds: number,
  qtyOfTicketsToSell: number,
  qtyOfWinners: number
}
function params({vrfCoordinator, ticketPrice, prize, qtyOfTicketsToSell, qtyOfEarlyBirds, qtyOfWinners}: Params) {
  const chainlinkParams = {
    // vrfCoordinator: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    link: "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255",
    keyHash:
      "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4",
    fee: toWei(0.0001),
  };
  // return [...Object.values(chainlinkParams), ...arguments];
  // return [...Object.values(chainlinkParams), ticketPrice, prize, qtyOfEarlyBirds, qtyOfTicketsToSell, qtyOfWinners]
  return [vrfCoordinator, ...Object.values(chainlinkParams), ticketPrice, prize, qtyOfTicketsToSell, qtyOfEarlyBirds, qtyOfWinners]
}

function toWei(ether: number | string) {
  return utils.parseEther(ether.toString()).toString();
}

describe("Tickets contract", async () => {
  let Contract: ContractFactory;
  let contract: Contract;
  let accounts: Signer[];
  // const constructorParams = [utils.parseEther("1"), utils.parseEther("450"), 100, 1100, 2]

  let defaultObj: Params;
  let defaultParams: (string | number)[];

  before(async () => {
    accounts = await ethers.getSigners();

    defaultObj = {
      vrfCoordinator: await accounts[0].getAddress(),

      ticketPrice: toWei(1),
      prize: toWei(4),
      qtyOfTicketsToSell: 10,
      qtyOfEarlyBirds: 3,
      qtyOfWinners: 2,
    }
    defaultParams = params(defaultObj);
  })

  beforeEach(async () => {
    Contract = await ethers.getContractFactory("Tickets");
    contract = await Contract.deploy(...defaultParams);
  });


  it("Setters set properly", async () => {
    expect(await contract.ticketPrice()).to.equal(defaultObj.ticketPrice)
    expect(await contract.prize()).to.equal(defaultObj.prize)
    expect(await contract.qtyOfTicketsToSell()).to.equal(defaultObj.qtyOfTicketsToSell)
    expect(await contract.qtyOfEarlyBirds()).to.equal(defaultObj.qtyOfEarlyBirds)
    expect(await contract.qtyOfWinners()).to.equal(defaultObj.qtyOfWinners)

    await contract.setTicketPrice(99);
    await contract.setPrize(99);
    await contract.setQtyOfTicketsToSell(99);
    await contract.setQtyOfEarlyBirds(99);
    await contract.setQtyOfWinners(99);

    expect(await contract.ticketPrice()).to.equal(99);
    expect(await contract.prize()).to.equal(99);
    expect(await contract.qtyOfTicketsToSell()).to.equal(99);
    expect(await contract.qtyOfEarlyBirds()).to.equal(99);
    expect(await contract.qtyOfWinners()).to.equal(99);
  })

  // it("getEntrantNumOfTickets() gets properly", async () => {
  //   expect(await contract.getEntrantNumOfTickets()) //TODO perhaps create a function that completes a round
  // })
});
