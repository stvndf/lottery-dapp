import { expect, util } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract, ContractFactory, utils } from "ethers";

describe("Tickets contract", async () => {
  // let accounts: Signer[];
  let Tickets: ContractFactory;
  let tickets: Contract;
  const constructorParams = [utils.parseEther("1"), utils.parseEther("450"), 100, 1100, 2]

  beforeEach(async function () {
    // accounts = await ethers.getSigners();
    Tickets = await ethers.getContractFactory("Tickets");
    tickets = await Tickets.deploy(...constructorParams)
  });

  it("should do something", async () => {
    await tickets.t();
    const tNum = await tickets.getEntrantNumOfTickets()
    console.log(tNum)
    expect(tNum).to.equal(123)

    const currentRound: number = await tickets.currentRound();
    expect(currentRound).to.equal(1);
  });
});