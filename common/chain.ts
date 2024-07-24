import { optimism, optimismSepolia } from "@alchemy/aa-core";

export default {
  [optimism.id]: optimism,
}[Number(process.env.EXPO_PUBLIC_CHAIN_ID)] ?? optimismSepolia;
