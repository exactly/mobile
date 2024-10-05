import chain, {
  auditorAddress,
  exaAccountFactoryAbi,
  exaPluginAbi,
  wethAddress,
} from "@exactly/common/generated/chain";
import { Address, Hash } from "@exactly/common/validation";
import { captureException, getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext, startSpan } from "@sentry/node";
import createDebug from "debug";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { BaseError, bytesToBigInt, ContractFunctionRevertedError } from "viem";
import { optimism } from "viem/chains";

import database, { credentials } from "../database";
import { auditorAbi, marketAbi } from "../generated/contracts";
import { headerValidator, jsonValidator } from "../utils/alchemy";
import decodePublicKey from "../utils/decodePublicKey";
import keeper from "../utils/keeper";
import publicClient from "../utils/publicClient";
import redis from "../utils/redis";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.ALCHEMY_ACTIVITY_KEY) throw new Error("missing alchemy activity key");
const signingKey = process.env.ALCHEMY_ACTIVITY_KEY;

const debug = createDebug("exa:activity");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const app = new Hono();

export default app.post(
  "/",
  headerValidator(signingKey),
  jsonValidator(
    v.object({
      event: v.object({
        activity: v.array(
          v.intersect([
            v.object({ fromAddress: Address, hash: Hash, toAddress: Address }),
            v.variant("category", [
              v.object({
                asset: v.literal("ETH"),
                category: v.picklist(["external", "internal"]),
                rawContract: v.object({ address: v.undefined() }),
                value: v.number(),
              }),
              v.object({
                asset: v.string(),
                category: v.picklist(["token", "erc20", "erc721", "erc1155"]),
                rawContract: v.object({ address: Address }),
                value: v.optional(v.number()),
              }),
            ]),
          ]),
        ),
        network: v.literal(chain.id === optimism.id ? "OPT_MAINNET" : "OPT_SEPOLIA"),
      }),
      type: v.literal("ADDRESS_ACTIVITY"),
    }),
    debug,
  ),
  async (c) => {
    setContext("alchemy", await c.req.json());
    getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "alchemy.activity");
    const transfers = c.req
      .valid("json")
      .event.activity.filter(({ category, value }) => category !== "erc721" && category !== "erc1155" && value);
    const accounts = await database.query.credentials
      .findMany({
        columns: { account: true, factory: true, publicKey: true },
        where: inArray(credentials.account, [...new Set(transfers.map(({ toAddress }) => toAddress))]),
      })
      .then((result) =>
        Object.fromEntries(
          result.map(
            ({ account, factory, publicKey }) =>
              [v.parse(Address, account), { factory: v.parse(Address, factory), publicKey }] as const,
          ),
        ),
      );
    const pokes = new Map<Address, { factory: Address; markets: Set<Address>; publicKey: Uint8Array }>();
    await Promise.all(
      transfers.map(async ({ rawContract, toAddress: account }) => {
        if (!accounts[account]) return;
        const asset = rawContract.address ?? wethAddress;
        const market = await redis.hgetall(`${chain.id}:${asset}`).then(async (found) => {
          const parsed = v.safeParse(MarketEntry, found);
          if (parsed.success) return parsed.output;
          const markets = await publicClient.readContract({
            abi: auditorAbi,
            address: auditorAddress,
            functionName: "allMarkets",
          });
          return Object.fromEntries(
            await Promise.all(
              markets.map(async (address, index) => {
                const underlying = await publicClient.readContract({ abi: marketAbi, address, functionName: "asset" });
                redis
                  .hset(`${chain.id}:${underlying}`, { index, market: address })
                  .catch((error: unknown) => captureException(error)); // eslint-disable-line promise/no-nesting -- floating promise
                return [underlying, { address: v.parse(Address, address), index }] as const;
              }),
            ),
          )[asset];
        });
        if (!market) return;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (pokes.has(account)) pokes.get(account)!.markets.add(market.address);
        else {
          const { factory, publicKey } = accounts[account];
          pokes.set(account, { factory, markets: new Set([market.address]), publicKey });
        }
      }),
    );
    Promise.allSettled(
      [...pokes.entries()].map(([account, { factory, markets, publicKey }]) =>
        startSpan({ attributes: { account }, name: "account activity", op: "exa.activity" }, async () => {
          if (
            !(await publicClient.getCode({ address: account })) &&
            !(await startSpan({ attributes: { account }, name: "create account", op: "exa.account" }, async () => {
              const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                publicClient.simulateContract({
                  abi: exaAccountFactoryAbi,
                  account: keeper.account,
                  address: factory,
                  args: [0n, [decodePublicKey(publicKey, bytesToBigInt)]],
                  functionName: "createAccount",
                  ...transactionOptions,
                }),
              );
              setContext("tx", request);
              const hash = await startSpan({ name: "deploy account", op: "tx.send" }, () =>
                keeper.writeContract(request),
              );
              setContext("tx", { transactionHash: hash });
              setContext("tx", { ...request, transactionHash: hash });
              const receipt = await startSpan({ name: "tx.wait", op: "tx.wait" }, () =>
                publicClient.waitForTransactionReceipt({ hash }),
              );
              setContext("tx", { ...request, ...receipt });
              return receipt.status === "success";
            }))
          ) {
            captureException(new Error("account deployment reverted"));
            return;
          }
          await Promise.allSettled(
            [...markets].map(async (market) => {
              await startSpan({ attributes: { account, market }, name: "poke account", op: "exa.poke" }, async () => {
                try {
                  const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                    publicClient.simulateContract({
                      abi: exaPluginAbi,
                      account: keeper.account,
                      address: account,
                      args: [market],
                      functionName: "poke",
                    }),
                  );
                  setContext("tx", request);
                  const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
                    keeper.writeContract(request),
                  );
                  setContext("tx", { ...request, transactionHash: hash });
                  const receipt = await startSpan({ name: "tx.wait", op: "tx.wait" }, () =>
                    publicClient.waitForTransactionReceipt({ hash }),
                  );
                  setContext("tx", { ...request, ...receipt });
                  if (receipt.status !== "success") captureException(new Error("tx reverted"));
                } catch (error: unknown) {
                  if (
                    error instanceof BaseError &&
                    error.cause instanceof ContractFunctionRevertedError &&
                    error.cause.data?.errorName === "NoBalance"
                  ) {
                    return;
                  }
                  captureException(error);
                }
              });
            }),
          );
        }),
      ),
    ).catch((error: unknown) => captureException(error));
    return c.json({});
  },
);

const MarketEntry = v.object({ address: Address, index: v.pipe(v.string(), v.transform(Number)) });
