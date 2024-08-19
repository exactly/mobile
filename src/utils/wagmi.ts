import { createAlchemyPublicRpcClient } from "@alchemy/aa-alchemy";
import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createConfig, createStorage, custom } from "wagmi";

import alchemyConnector from "./alchemyConnector";

const publicClient = createAlchemyPublicRpcClient({ chain, connectionConfig: { apiKey: alchemyAPIKey } });

export default createConfig({
  chains: [chain],
  connectors: [alchemyConnector(publicClient)],
  transports: { [chain.id]: custom(publicClient) },
  storage: createStorage({ storage: AsyncStorage }),
  multiInjectedProviderDiscovery: false,
});
