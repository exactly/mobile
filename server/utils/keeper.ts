import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { Hash } from "@exactly/common/validation";
import { parse } from "valibot";
import { createWalletClient, http, nonceManager } from "viem";
import { privateKeyToAccount } from "viem/accounts";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createWalletClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`),
  account: privateKeyToAccount(
    parse(Hash, process.env.KEEPER_PRIVATE_KEY, {
      message: "invalid keeper private key",
    }),
    { nonceManager },
  ),
});
