import chain from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { parse } from "valibot";
import { optimism } from "viem/chains";

const collectors: Address[] = (
  {
    [optimism.id]: [
      "0x0f25bA5b8B0BA4Ff4dF645fDE030652da60BabA6",
      "0x471e5F3428D5C50543072c817a9D0CcBa8ed7D5F",
      "0x3a73880ff21ABf9cA9F80B293570a3cBD846eFc5",
    ],
  }[chain.id] ?? ["0xDb90CDB64CfF03f254e4015C4F705C3F3C834400"]
).map((address) => parse(Address, address));

export default collectors;
