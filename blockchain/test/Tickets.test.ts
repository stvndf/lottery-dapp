import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract, ContractFactory, utils } from "ethers";

describe("Tickets contract", async () => {
  let accounts: Signer[];
  let Contract: ContractFactory;
  let contract: Contract;
  // const constructorParams = [utils.parseEther("1"), utils.parseEther("450"), 100, 1100, 2]
  const constructorParams = [utils.parseEther("1"), utils.parseEther("1"), 3, 6, 2]


  beforeEach(async function () {
    accounts = await ethers.getSigners();
    Contract = await ethers.getContractFactory("Tickets");
    contract = await Contract.deploy(...constructorParams)
  });

  // it("should do something", async () => {
  //   const x = await contract.expand(100, 5);
  //   const x2 = x.map((num: BigInt) => num.toString())
  //   console.log(x2)

  //   const currentRound: number = await contract.currentRound();
  //   expect(currentRound).to.equal(1);
  // });

  it("getWinners function should work fine", async () => {
    await contract.buyTicket({value: utils.parseEther("1")})
    await contract.connect(accounts[1]).buyTicket({value: utils.parseEther("1")})
    await contract.buyTicket({value: utils.parseEther("1")})
    await contract.buyTicket({value: utils.parseEther("1")})
    await contract.buyTicket({value: utils.parseEther("1")})
    await contract.buyTicket({value: utils.parseEther("1")})
console.log(await contract.getEntrantNumOfTickets(accounts[0].getAddress()))
console.log(await contract.getEntrantNumOfTickets(accounts[1].getAddress()))
console.log(await contract.soldTickets())
console.log(await contract.bonusTickets())
    expect(await contract.soldTickets()).to.equal(6)
    expect(await contract.bonusTickets()).to.equal(6)
  });
});