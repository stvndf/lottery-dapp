import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import {
  ChainId,
  useEtherBalance,
  useEthers,
} from "@usedapp/core";

const Home: NextPage = () => {
  const { activateBrowserWallet, account } = useEthers();
  const etherBalance = useEtherBalance(account);

  return (
    <div>
      <h1>WIP</h1>
      <div>
        <button onClick={() => activateBrowserWallet()}>Connect</button>
      </div>
      {account && <p>Account: {account}</p>}
      {etherBalance && <p>Balace: {etherBalance.toString()}</p>}
    </div>
  );
};

export default Home;
