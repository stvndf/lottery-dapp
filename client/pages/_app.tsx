import "../styles/globals.css";
import type { AppProps } from "next/app";
import { DAppProvider, ChainId } from "@usedapp/core";

const config = {
  readOnlyChainId: ChainId.Ropsten,
  readOnlyUrls: {
    [ChainId.Mainnet]:
      "https://mainnet.infura.io/v3/62687d1a985d4508b2b7a24827551934",
  },
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <DAppProvider config={undefined}>
      <Component {...pageProps} />
    </DAppProvider>
  );
}
export default MyApp;
