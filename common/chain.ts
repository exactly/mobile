import { goerli } from "wagmi/chains";

export default {
  ...goerli,
  fees: undefined,
  network: "goerli",
  rpcUrls: {
    ...goerli.rpcUrls,
    public: {
      http: ["https://rpc.ankr.com/eth_goerli"],
    },
    alchemy: {
      http: ["https://eth-goerli.g.alchemy.com/v2"],
      webSocket: ["wss://eth-goerli.g.alchemy.com/v2"],
    },
  },
};
