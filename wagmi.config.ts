import { defineConfig } from "@wagmi/cli";
import { actions, react } from "@wagmi/cli/plugins";
import { readFileSync, readdirSync } from "node:fs";
import { basename, extname } from "node:path";
import { getAddress } from "viem";

import chain from "./common/chain";

const directory = "node_modules/@exactly/protocol/deployments";
const network = readdirSync(directory).find((n) => Number(readFileSync(`${directory}/${n}/.chainId`)) === chain.id);
if (!network) throw new Error(`no deployment found for chain ${chain.id}`);

const deployment = <T>(name: string) => JSON.parse(readFileSync(`${directory}/${network}/${name}`).toString()) as T;

let firstMarket = true;

const contracts = readdirSync(`${directory}/${network}`).flatMap((name) => {
  if (extname(name) !== ".json" || name.includes("_")) return [];
  if (!name.startsWith("Auditor") && !name.startsWith("Market")) return [];

  const { address, abi } = deployment<{ address?: unknown; abi?: unknown }>(name);
  if (typeof address !== "string" || !Array.isArray(abi)) return [];

  return [
    ...(firstMarket
      ? (() => {
          firstMarket = false;
          return [{ name: "Market", abi }];
        })()
      : []),
    { name: basename(name, ".json"), abi, address: getAddress(address) },
  ];
});

export default defineConfig({ out: "common/wagmi.ts", contracts, plugins: [react(), actions()] });
