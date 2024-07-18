import { chain } from "@exactly/common/constants.js";
import { Hash } from "@exactly/common/types.js";
import { secp256k1 } from "@noble/curves/secp256k1";
import { parse } from "valibot";
import { keccak256, serializeTransaction, toHex, type TransactionSerializable } from "viem";

const privateKey = parse(Hash, process.env.PRIVATE_KEY, { message: "invalid private key" });

export default function signTransactionSync(transaction: TransactionSerializable) {
  const serializer = chain.serializers?.transaction ?? serializeTransaction;
  const { r, s, recovery } = secp256k1.sign(keccak256(serializer(transaction)).slice(2), privateKey.slice(2));
  const signature = { r: toHex(r), s: toHex(s), v: recovery ? 28n : 27n, yParity: recovery };
  return serializer(transaction, signature);
}
