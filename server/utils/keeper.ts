import chain from "@exactly/common/generated/chain";
import { Hash } from "@exactly/common/types";
import { secp256k1 } from "@noble/curves/secp256k1";
import { parse } from "valibot";
import { keccak256, nonceManager, serializeTransaction, toHex, type TransactionSerializable } from "viem";
import { privateKeyToAccount } from "viem/accounts";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

const privateKey = parse(Hash, process.env.KEEPER_PRIVATE_KEY, { message: "invalid private key" });
const account = privateKeyToAccount(privateKey, { nonceManager });

export const address = account.address;

export function signTransactionSync(transaction: TransactionSerializable) {
  const serializer = chain.serializers?.transaction ?? serializeTransaction;
  const { r, s, recovery } = secp256k1.sign(keccak256(serializer(transaction)).slice(2), privateKey.slice(2));
  const signature = { r: toHex(r), s: toHex(s), v: recovery ? 28n : 27n, yParity: recovery };
  return serializer(transaction, signature);
}
