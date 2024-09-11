import chain, {
  auditorAbi,
  auditorAddress,
  exaAccountFactoryAbi,
  exaPluginAbi,
  marketAbi,
  wethAddress,
} from "@exactly/common/generated/chain";
import { Address, Hash } from "@exactly/common/types";
import { captureException, getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext, startSpan } from "@sentry/node";
import createDebug from "debug";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { BaseError, bytesToBigInt, ContractFunctionRevertedError } from "viem";
import { optimism } from "viem/chains";

import database, { credentials } from "../database";
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

app.post(
  "/",
  headerValidator(signingKey),
  jsonValidator(
    v.object({
      type: v.literal("ADDRESS_ACTIVITY"),
      event: v.object({
        network: v.literal(chain.id === optimism.id ? "OPT_MAINNET" : "OPT_SEPOLIA"),
        activity: v.array(
          v.intersect([
            v.object({ hash: Hash, fromAddress: Address, toAddress: Address }),
            v.variant("category", [
              v.object({
                category: v.picklist(["external", "internal"]),
                asset: v.literal("ETH"),
                rawContract: v.object({ address: v.undefined() }),
                value: v.number(),
              }),
              v.object({
                category: v.picklist(["token", "erc20", "erc721", "erc1155"]),
                asset: v.string(),
                rawContract: v.object({ address: Address }),
                value: v.optional(v.number()),
              }),
            ]),
          ]),
        ),
      }),
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
        columns: { account: true, publicKey: true, factory: true },
        where: inArray(credentials.account, [...new Set(transfers.map(({ toAddress }) => toAddress))]),
      })
      .then((result) =>
        Object.fromEntries(
          result.map(
            ({ account, publicKey, factory }) =>
              [v.parse(Address, account), { publicKey, factory: v.parse(Address, factory) }] as const,
          ),
        ),
      );
    const pokes = new Map<Address, { publicKey: Uint8Array; factory: Address; markets: Set<Address> }>();
    await Promise.all(
      transfers.map(async ({ toAddress: account, rawContract }) => {
        if (!accounts[account]) return;
        const asset = rawContract.address ?? wethAddress;
        const market = await redis.hgetall(`${String(chain.id)}:${asset}`).then(async (found) => {
          const parsed = v.safeParse(MarketEntry, found);
          if (parsed.success) return parsed.output;
          const markets = await publicClient.readContract({
            address: auditorAddress,
            functionName: "allMarkets",
            abi: auditorAbi,
          });
          return Object.fromEntries(
            await Promise.all(
              markets.map(async (address, index) => {
                const underlying = await publicClient.readContract({ address, functionName: "asset", abi: marketAbi });
                redis
                  .hset(`${String(chain.id)}:${underlying}`, { market: address, index })
                  .catch((error: unknown) => captureException(error));
                return [underlying, { address: v.parse(Address, address), index }] as const;
              }),
            ),
          )[asset];
        });
        if (!market) return;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (pokes.has(account)) pokes.get(account)!.markets.add(market.address);
        else {
          const { publicKey, factory } = accounts[account];
          pokes.set(account, { publicKey, factory, markets: new Set([market.address]) });
        }
      }),
    );
    Promise.allSettled(
      [...pokes.entries()].map(([account, { publicKey, factory, markets }]) =>
        startSpan({ name: "account activity", op: "exa.activity", attributes: { account } }, async () => {
          if (
            !(await publicClient.getCode({ address: account })) &&
            !(await startSpan({ name: "create account", op: "exa.account", attributes: { account } }, async () => {
              const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                publicClient.simulateContract({
                  account: keeper.account,
                  address: factory,
                  functionName: "createAccount",
                  args: [0n, [decodePublicKey(publicKey, bytesToBigInt)]],
                  abi: exaAccountFactoryAbi,
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
              await startSpan({ name: "poke account", op: "exa.poke", attributes: { account, market } }, async () => {
                try {
                  const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                    publicClient.simulateContract({
                      account: keeper.account,
                      address: account,
                      functionName: "poke",
                      args: [market],
                      abi: exaPluginAbi,
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

export default app;

const MarketEntry = v.object({ address: Address, index: v.pipe(v.string(), v.transform(Number)) });
