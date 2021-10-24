import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, Contract, ContractFactory, utils } from "ethers";

type Params = {
  vrfCoordinator: string;
  link: string;
  ticketPrice: string;
  prize: string;
  qtyOfEarlyBirds: number;
  qtyOfTicketsToSell: number;
  qtyOfWinners: number;
};
function params({
  vrfCoordinator,
  link,
  ticketPrice,
  prize,
  qtyOfTicketsToSell,
  qtyOfEarlyBirds,
  qtyOfWinners,
}: Params) {
  const chainlinkParams = {
    // vrfCoordinator: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    // link: "0x8C7382F9D8f56b33781fE506E897a4F1e2d17255",
    keyHash:
      "0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4",
    fee: toWei(0.0001),
  };
  return [
    vrfCoordinator,
    link,
    ...Object.values(chainlinkParams),
    ticketPrice,
    prize,
    qtyOfTicketsToSell,
    qtyOfEarlyBirds,
    qtyOfWinners,
  ];
}

function toWei(ether: number | string) {
  return utils.parseEther(ether.toString()).toString();
}

describe("Tickets contract", async () => {
  let Contract: ContractFactory, Link: ContractFactory;
  let contract: Contract, link: Contract;
  let accounts: Signer[];
  // const constructorParams = [utils.parseEther("1"), utils.parseEther("450"), 100, 1100, 2]

  let defaultParams: Params;
  let defaultParamsForConstructor: (string | number)[];

  async function buyTickets(
    qtyOfTicketsToBuy: number | "ALL",
    qtyOfAccsToBuyWith = 1
  ) {
    if (qtyOfAccsToBuyWith < 1 || qtyOfAccsToBuyWith > 20)
      throw new Error("Invalid number of accounts");

    if (qtyOfTicketsToBuy === "ALL")
      qtyOfTicketsToBuy = defaultParams.qtyOfTicketsToSell;

    for (let i = 0; i < qtyOfTicketsToBuy; i++) {
      const acc = accounts[i % qtyOfAccsToBuyWith]; // iterates through accs
      await contract
        .connect(acc)
        .buyTicket({ value: defaultParams.ticketPrice });
    }
  }

  async function setContract(params: (string | number)[]) {
    Contract = await ethers.getContractFactory("Tickets");
    contract = await Contract.deploy(...params);
    await link.transfer(contract.address, toWei(10));
  }

  async function resetRound(randomNumber: string | number = "1000000000") {
    await contract
      .connect(accounts[0]) // same as address passed as vrfCoordinator
      .rawFulfillRandomness(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        randomNumber
      );
  }

  before(async () => {
    accounts = await ethers.getSigners();

    Link = await ethers.getContractFactory("LinkToken");
    link = await Link.deploy();

    defaultParams = {
      vrfCoordinator: await accounts[0].getAddress(),
      link: link.address,

      ticketPrice: toWei(1),
      prize: toWei(4),
      qtyOfTicketsToSell: 10,
      qtyOfEarlyBirds: 3,
      qtyOfWinners: 2,
    };
    defaultParamsForConstructor = params(defaultParams);
  });

  beforeEach(async () => {
    await setContract(params(defaultParams));
  });

  it("works", async () => {
    console.log("{test start}")

    await buyTickets("ALL", 2);
    expect(await contract.soldTickets()).to.equal(defaultParams.qtyOfTicketsToSell)

    await resetRound()

    console.log("{test end}")
  })

  it("Setters set properly", async () => {
    expect(await contract.ticketPrice()).to.equal(defaultParams.ticketPrice);
    expect(await contract.prize()).to.equal(defaultParams.prize);
    expect(await contract.qtyOfTicketsToSell()).to.equal(
      defaultParams.qtyOfTicketsToSell
    );
    expect(await contract.qtyOfEarlyBirds()).to.equal(
      defaultParams.qtyOfEarlyBirds
    );
    expect(await contract.qtyOfWinners()).to.equal(defaultParams.qtyOfWinners);

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
  });

  it("getEntrantNumOfTickets function", async () => {
    expect(
      await contract.getEntrantNumOfTickets(accounts[0].getAddress())
    ).to.equal(0);
    await buyTickets(5, 2);

    expect(
      await contract.getEntrantNumOfTickets(accounts[0].getAddress())
    ).to.equal(3 + 2);
    expect(
      await contract.getEntrantNumOfTickets(accounts[1].getAddress())
    ).to.equal(2 + 1);

    const remainingTickets = defaultParams.qtyOfTicketsToSell - 5;
    await buyTickets(remainingTickets);

    expect(
      await contract.getEntrantNumOfTickets(accounts[0].getAddress())
    ).to.equal(3 + 2 + remainingTickets);
    expect(
      await contract.getEntrantNumOfTickets(accounts[1].getAddress())
    ).to.equal(2 + 1);

    await resetRound();
    expect(
      await contract.getEntrantNumOfTickets(accounts[1].getAddress())
    ).to.equal(0);
  });

  it("Properly counts sold tickets", async () => {
    expect(await contract.soldTickets()).to.equal(0);
    await buyTickets(3);
    expect(await contract.soldTickets()).to.equal(3);
    await buyTickets(3, 3);
    expect(await contract.soldTickets()).to.equal(6);

    const remainingTickets = defaultParams.qtyOfTicketsToSell - 3 - 3;
    await buyTickets(remainingTickets);
    expect(await contract.soldTickets()).to.equal(
      defaultParams.qtyOfTicketsToSell
    );
    await resetRound();

    expect(await contract.soldTickets()).to.equal(0);
    await buyTickets(2, 2);
    expect(await contract.soldTickets()).to.equal(2);
  });

  it("Properly counts bonus tickets", async () => {
    expect(await contract.soldTickets()).to.equal(0);
    await buyTickets(2, 1);
    expect(await contract.bonusTickets()).to.equal(2);

    await buyTickets(1);
    expect(await contract.bonusTickets()).to.equal(3);

    const remainingTickets = defaultParams.qtyOfTicketsToSell - 2 - 1;
    await buyTickets(remainingTickets, 3);
    expect(await contract.bonusTickets()).to.equal(3);

    await resetRound();
    expect(await contract.bonusTickets()).to.equal(0);
  });

  it("Can't buy over max tickets (before round reset is complete)", async () => {
    await buyTickets("ALL", 2);
    await expect(
      contract.buyTicket({ value: defaultParams.ticketPrice })
    ).to.be.revertedWith("Round is currently resetting");

    await resetRound();
    await expect(contract.buyTicket({ value: defaultParams.ticketPrice })).to
      .not.be.reverted;
  });

  // it("does not give duplicate winner")
  // it("round number increase upon new round")
  // it("referral bonus")
  // it("winners receive share of prize")
  // do full round (incl resetting) with full expected parameters (1100 sales, use all 20 accs)
  // must buy ticket for exact amount. also check upon set/change of price
  // totalTickets check (like sold/bonus tickets)

  it("Ticket sales are locked in between rounds", async () => {
    expect(await contract.roundResetInProcess()).to.equal(false);
    // await buyTickets("ALL");
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:0", await contract.ticketToOwner(0))
// console.log("ticketToOwner1:", await contract.ticketToOwner(1))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:2", await contract.ticketToOwner(2))
// console.log("ticketToOwner:3", await contract.ticketToOwner(3))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:4", await contract.ticketToOwner(4))
// console.log("ticketToOwner:5", await contract.ticketToOwner(5))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:6", await contract.ticketToOwner(6))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:7", await contract.ticketToOwner(7))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:8", await contract.ticketToOwner(8))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:9", await contract.ticketToOwner(9))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:10", await contract.ticketToOwner(10))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:11", await contract.ticketToOwner(11))
await contract.buyTicket({value: toWei(1)})
// console.log("ticketToOwner:12", await contract.ticketToOwner(12))

    expect(await contract.roundResetInProcess()).to.equal(true);
    await expect(
      contract.buyTicket({ value: defaultParams.ticketPrice })
    ).to.be.revertedWith("Round is currently resetting");

    await resetRound();
    expect(await contract.roundResetInProcess()).to.equal(false);
  });

  // it("currentRound variable increases each round", async () => {
  //   // await setContract(params({...defaultParams, prize: toWei(4)}));

  //   let round = 1;

  //   expect(await contract.currentRound()).to.equal(round);
  //   buyTickets("ALL", 2);
  //   await resetRound();
  //   round++;
  //   expect(await contract.currentRound()).to.equal(round);


  // })
});
