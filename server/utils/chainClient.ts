import { alchemyAPIKey, chain } from "@exactly/common/constants.js";
import { Hash } from "@exactly/common/types.js";
import { parse } from "valibot";
import { createClient, http, publicActions, walletActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createClient({
  chain,
  account: privateKeyToAccount(parse(Hash, process.env.PRIVATE_KEY, { message: "invalid private key" })),
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`),
})
  .extend(publicActions)
  .extend(walletActions);
