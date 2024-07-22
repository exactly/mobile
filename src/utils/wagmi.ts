import { createAlchemyPublicRpcClient } from "@alchemy/aa-alchemy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createConfig, createStorage, custom } from "wagmi";

import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/chain";

import alchemyConnector from "./alchemyConnector.js";

const publicClient = createAlchemyPublicRpcClient({ chain, connectionConfig: { apiKey: alchemyAPIKey } });

export default createConfig({
  chains: [chain],
  connectors: [alchemyConnector(publicClient)],
  transports: { [chain.id]: custom(publicClient) },
  storage: createStorage({ storage: AsyncStorage }),
  multiInjectedProviderDiscovery: false,
});
