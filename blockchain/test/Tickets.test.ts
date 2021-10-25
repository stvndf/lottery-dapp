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
    qtyOfTicketsToBuy: number | "ALL20",
    qtyOfAccsToBuyWith = 1
  ) {
    if (qtyOfTicketsToBuy === "ALL20")
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

  it("getEntrantQtyOfTickets function", async () => {
    expect(
      await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
    ).to.equal(0);
    await buyTickets(5, 2);

    expect(
      await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
    ).to.equal(3 + 2);
    expect(
      await contract.getEntrantQtyOfTickets(accounts[1].getAddress())
    ).to.equal(2 + 1);

    const remainingTickets = defaultParams.qtyOfTicketsToSell - 5;
    await buyTickets(remainingTickets);

    expect(
      await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
    ).to.equal(3 + 2 + remainingTickets);
    expect(
      await contract.getEntrantQtyOfTickets(accounts[1].getAddress())
    ).to.equal(2 + 1);

    await resetRound();
    expect(
      await contract.getEntrantQtyOfTickets(accounts[1].getAddress())
    ).to.equal(0);
  });

  it("Properly counts soldTickets", async () => {
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

  it("Properly counts bonusTickets", async () => {
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

  it("Properly counts totalTickets", async () => {
    expect(await contract.totalTickets()).to.equal(0);
    await buyTickets(3, 3);
    expect(await contract.totalTickets()).to.equal(3 + 3);

    const remainingTickets = defaultParams.qtyOfTicketsToSell - 3;
    await buyTickets(remainingTickets);
    expect(await contract.totalTickets()).to.equal(
      defaultParams.qtyOfTicketsToSell + 3
    );

    await resetRound();
    expect(await contract.totalTickets()).to.equal(0);
  });

  it("Can't buy over max tickets (before round reset is complete)", async () => {
    await buyTickets("ALL20", 2);
    await expect(
      contract.buyTicket({ value: defaultParams.ticketPrice })
    ).to.be.revertedWith("Round is currently resetting");

    await resetRound();
    await expect(contract.buyTicket({ value: defaultParams.ticketPrice })).to
      .not.be.reverted;
  });

  describe("Referral bonus", async () => {
    it("Referral bonus awarded accurately", async () => {
      expect(await contract.soldTickets()).to.equal(0);
      expect(await contract.bonusTickets()).to.equal(0);
      expect(await contract.totalTickets()).to.equal(0);

      await contract.connect(accounts[0]).buyTicket({ value: toWei(1) });
      expect(await contract.soldTickets()).to.equal(1);
      expect(await contract.bonusTickets()).to.equal(1);
      expect(await contract.totalTickets()).to.equal(1 + 1);
      expect(
        await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
      ).to.equal(1 + 1);

      await contract
        .connect(accounts[1])
        .buyTicketWithReferral(accounts[0].getAddress(), { value: toWei(1) });

      expect(await contract.soldTickets()).to.equal(2);
      expect(await contract.bonusTickets()).to.equal(3);
      expect(await contract.totalTickets()).to.equal(2 + 2 + 1);
      expect(
        await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
      ).to.equal(1 + (1 + 1)); // 1 bonus ticket for referral
      expect(
        await contract.getEntrantQtyOfTickets(accounts[1].getAddress())
      ).to.equal(1 + 1);
    });

    it("Referral bonus awarded to self accurately", async () => {
      await contract.connect(accounts[0]).buyTicket({ value: toWei(1) });
      expect(await contract.soldTickets()).to.equal(1);
      expect(await contract.bonusTickets()).to.equal(1);
      expect(await contract.totalTickets()).to.equal(1 + 1);
      expect(
        await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
      ).to.equal(1 + 1);

      await contract
        .connect(accounts[0])
        .buyTicketWithReferral(accounts[0].getAddress(), { value: toWei(1) });

      expect(await contract.soldTickets()).to.equal(2);
      expect(await contract.bonusTickets()).to.equal(3);
      expect(await contract.totalTickets()).to.equal(2 + 2 + 1);
      expect(
        await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
      ).to.equal(2 + (2 + 1)); // 1 bonus ticket for referral
    });

    it("Referral bonus shouldn't be awarded if referrer hasn't participated in current round", async () => {
      await buyTickets(defaultParams.qtyOfTicketsToSell - 1);
      await contract.buyTicketWithReferral(accounts[0].getAddress(), {
        value: toWei(1),
      });
      expect(await contract.soldTickets()).to.equal(
        defaultParams.qtyOfTicketsToSell
      );
      expect(await contract.bonusTickets()).to.equal(
        defaultParams.qtyOfEarlyBirds + 1
      );
      expect(await contract.totalTickets()).to.equal(
        defaultParams.qtyOfTicketsToSell + defaultParams.qtyOfEarlyBirds + 1
      );

      await resetRound();

      await contract
        .connect(accounts[1])
        .buyTicketWithReferral(accounts[0].getAddress(), { value: toWei(1) });
      expect(await contract.soldTickets()).to.equal(1);
      expect(await contract.bonusTickets()).to.equal(1);
      expect(await contract.totalTickets()).to.equal(1 + 1);
      expect(
        await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
      ).to.equal(0); // 0 bonus ticket for referral
    });
  });

  describe("Prize awarded accurately", () => {
    it("Contract's balance correct", async () => {
      expect(await ethers.provider.getBalance(contract.address)).to.equal(0);

      await buyTickets("ALL20", 3);

      const contractFullRoundBal = (
        BigInt(defaultParams.ticketPrice) *
        BigInt(defaultParams.qtyOfTicketsToSell)
      ).toString();
      expect(await ethers.provider.getBalance(contract.address)).to.equal(
        contractFullRoundBal
      );

      await resetRound();
      const contractNextRoundBal = (
        BigInt(contractFullRoundBal) - BigInt(defaultParams.prize)
      ).toString();
      expect(await ethers.provider.getBalance(contract.address)).to.equal(
        contractNextRoundBal
      );
    });

    it("Participants' balances correct", async () => {
      expect(await ethers.provider.getBalance(contract.address)).to.equal(0);

      await buyTickets("ALL20", 3);

      const acc0BalBeforeAward = await accounts[0].getBalance();
      const acc1BalBeforeAward = await accounts[1].getBalance();
      const acc2BalBeforeAward = await accounts[2].getBalance();

      await resetRound();

      const acc0BalAfterAward = await accounts[0].getBalance();
      const acc1BalAfterAward = await accounts[1].getBalance();
      const acc2BalAfterAward = await accounts[2].getBalance();

      const acc0BalDiff = acc0BalAfterAward.sub(acc0BalBeforeAward);
      const acc1BalDiff = acc1BalAfterAward.sub(acc1BalBeforeAward);
      const acc2BalDiff = acc2BalAfterAward.sub(acc2BalBeforeAward);

      const totalBalDiff = acc0BalDiff
        .add(acc1BalDiff)
        .add(acc2BalDiff)
        .toBigInt();
      const lowerRange =
        (BigInt(defaultParams.prize) * BigInt(95)) / BigInt(100); // 5% range to account for gas usage

      expect(totalBalDiff <= BigInt(defaultParams.prize)).to.be.true;
      expect(totalBalDiff >= lowerRange).to.be.true;
    });
  });

  it("Ticket sales are locked in between rounds", async () => {
    expect(await contract.roundResetInProcess()).to.equal(false);
    await buyTickets("ALL20");
    expect(await contract.roundResetInProcess()).to.equal(true);
    await expect(
      contract.buyTicket({ value: defaultParams.ticketPrice })
    ).to.be.revertedWith("Round is currently resetting");

    await resetRound();
    expect(await contract.roundResetInProcess()).to.equal(false);
  });

  it("currentRound variable increases each round", async () => {
    let round = 1;

    expect(await contract.currentRound()).to.equal(round);
    await buyTickets("ALL20");

    await resetRound();
    round++;
    expect(await contract.currentRound()).to.equal(round);
  });

  it("Only vrfCoordinator can call rawFulfillRandomness", async () => {
    await buyTickets("ALL20");
    await expect(
      contract
        .connect(accounts[0]) // same as address passed as vrfCoordinator
        .rawFulfillRandomness(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "1000000000"
        )
    ).to.not.be.reverted;

    await buyTickets("ALL20");
    await expect(
      contract
        .connect(accounts[1]) // not same as address passed as vrfCoordinator
        .rawFulfillRandomness(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "1000000000"
        )
    ).to.be.reverted;
  });

  it("LINK withdrawal", async () => {
    const beforeAcc0LinkBal = await link.balanceOf(accounts[0].getAddress());
    const beforeContractLinkBal = await link.balanceOf(contract.address);

    await contract.withdrawLink(100);

    const afterAcc0LinkBal = await link.balanceOf(accounts[0].getAddress());
    const afterContractLinkBal = await link.balanceOf(contract.address);
    const acc0BalDiff = afterAcc0LinkBal.sub(beforeAcc0LinkBal).toNumber();
    const contractBalDiff = beforeContractLinkBal
      .sub(afterContractLinkBal)
      .toNumber();

    expect(acc0BalDiff).to.equal(100);
    expect(contractBalDiff).to.equal(100);
  });

  it("Crypto withdrawal", async () => {
    await buyTickets("ALL20");

    await contract.withdrawSurplus();

    const afterContract0Bal = (
      await ethers.provider.getBalance(contract.address)
    ).toString();

    expect(afterContract0Bal).to.equal(defaultParams.prize); // restricted to prize amount
  });

  it("Ticket buys for correct amount", async () => {
    await contract.buyTicket({ value: toWei(1) });
    expect(await contract.soldTickets()).to.be.equal(1);

    await expect(contract.buyTicket({ value: toWei(1.1) })).to.be.revertedWith(
      "Value does not match ticket price"
    );
    await expect(contract.buyTicket({ value: toWei(0.9) })).to.be.revertedWith(
      "Value does not match ticket price"
    );
    expect(await contract.soldTickets()).to.be.equal(1);

    await contract.setTicketPrice(toWei(2));
    await contract.buyTicket({ value: toWei(2) });
    expect(await contract.soldTickets()).to.be.equal(2);

    await expect(contract.buyTicket({ value: toWei(1) })).to.be.revertedWith(
      "Value does not match ticket price"
    );
    expect(await contract.soldTickets()).to.be.equal(2);
  });

  it("Emits event properly", async () => {
    await buyTickets("ALL20", 2);

    const resetRoundTx = await contract
      .connect(accounts[0])
      .rawFulfillRandomness(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "1000000000"
      );
    const resetRoundWait = await resetRoundTx.wait();
    const eventArgs = resetRoundWait.events[0].args;
    const [
      roundNumber,
      qtyOfWinners,
      winners,
      totalPrize,
      prizeEach,
      timestamp,
    ]: any = eventArgs;
    expect(roundNumber).to.equal(1);
    expect(qtyOfWinners).to.equal(defaultParams.qtyOfWinners);
    expect(totalPrize).to.equal(defaultParams.prize);
    expect(prizeEach).to.equal(
      BigInt(defaultParams.prize) / BigInt(defaultParams.qtyOfWinners)
    );
  });

  it("Full round (large non-testing parameters)", async () => {
    const newParams: Params = {
      vrfCoordinator: defaultParams.vrfCoordinator,
      link: defaultParams.link,
      ticketPrice: toWei(1),
      prize: toWei(4.5),
      qtyOfTicketsToSell: 1100,
      qtyOfEarlyBirds: 100,
      qtyOfWinners: 2,
    };
    await setContract(params(newParams));

    await buyTickets(1100, 20);
    expect(await contract.soldTickets()).to.equal(newParams.qtyOfTicketsToSell);
    expect(await contract.bonusTickets()).to.equal(newParams.qtyOfEarlyBirds);
    expect(await contract.totalTickets()).to.equal(
      newParams.qtyOfTicketsToSell + newParams.qtyOfEarlyBirds
    );
    const acc0TotalTickets =
      newParams.qtyOfTicketsToSell / 20 + newParams.qtyOfEarlyBirds / 20;
    expect(
      await contract.getEntrantQtyOfTickets(accounts[0].getAddress())
    ).to.equal(acc0TotalTickets);

    await resetRound();

    await contract.buyTicket({ value: toWei(1) });
    expect(await contract.totalTickets()).to.equal(1 + 1);
  }).timeout(100000);
});
