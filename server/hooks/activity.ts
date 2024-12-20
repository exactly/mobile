import chain, {
  exaAccountFactoryAbi,
  exaPluginAbi,
  previewerAddress,
  upgradeableModularAccountAbi,
  wethAddress,
} from "@exactly/common/generated/chain";
import { Address, Hash } from "@exactly/common/validation";
import {
  captureException,
  continueTrace,
  getActiveSpan,
  getTraceData,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  setContext,
  startSpan,
} from "@sentry/node";
import createDebug from "debug";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { BaseError, bytesToBigInt, ContractFunctionRevertedError, zeroAddress, withRetry } from "viem";
import { optimism } from "viem/chains";

import database, { credentials } from "../database";
import { auditorAbi, marketAbi, previewerAbi } from "../generated/contracts";
import { headerValidator, jsonValidator } from "../utils/alchemy";
import decodePublicKey from "../utils/decodePublicKey";
import keeper from "../utils/keeper";
import { sendPushNotification } from "../utils/onesignal";
import publicClient from "../utils/publicClient";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.ALCHEMY_ACTIVITY_KEY) throw new Error("missing alchemy activity key");
const signingKey = process.env.ALCHEMY_ACTIVITY_KEY;

const ETH = v.parse(Address, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");

const debug = createDebug("exa:activity");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const app = new Hono();

export default app.post(
  "/",
  headerValidator(new Set([signingKey])),
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
                rawContract: v.object({ address: v.optional(v.undefined()) }),
                value: v.number(),
              }),
              v.object({
                category: v.picklist(["token", "erc20", "erc721", "erc1155"]),
                asset: v.optional(v.string()),
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

    const exactly = await withRetry(
      () =>
        publicClient.readContract({
          address: previewerAddress,
          functionName: "exactly",
          abi: previewerAbi,
          args: [zeroAddress],
        }),
      { delay: 100, retryCount: 5 },
    );
    const marketsByAsset = new Map<Address, Address>(
      exactly.map((market) => [v.parse(Address, market.asset), v.parse(Address, market.market)]),
    );
    const pokes = new Map<Address, { publicKey: Uint8Array; factory: Address; assets: Set<Address> }>();
    for (const { toAddress: account, rawContract, value, asset: assetSymbol } of transfers) {
      if (!accounts[account]) continue;
      const asset = rawContract.address ?? ETH;
      const underlying = asset === ETH ? v.parse(Address, wethAddress) : asset;
      if (!marketsByAsset.has(underlying)) continue;

      sendPushNotification({
        userId: account,
        headings: { en: "Funds added" },
        contents: { en: `${value ? `${value} ` : ""}${assetSymbol} received` },
      }).catch((error: unknown) => captureException(error));
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (pokes.has(account)) pokes.get(account)!.assets.add(asset);
      else {
        const { publicKey, factory } = accounts[account];
        pokes.set(account, { publicKey, factory, assets: new Set([asset]) });
      }
    }
    const { "sentry-trace": sentryTrace, baggage } = getTraceData();
    Promise.allSettled(
      [...pokes.entries()].map(([account, { publicKey, factory, assets }]) =>
        continueTrace({ sentryTrace, baggage }, () =>
          startSpan(
            { name: "account activity", op: "exa.activity", attributes: { account }, parentSpan: null },
            async () => {
              if (
                !(await publicClient.getCode({ address: account })) &&
                !(await startSpan({ name: "create account", op: "exa.account", attributes: { account } }, async () => {
                  try {
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
                    setContext("tx", { ...request, transactionHash: hash });
                    const receipt = await startSpan({ name: "tx.wait", op: "tx.wait" }, () =>
                      publicClient.waitForTransactionReceipt({ hash }),
                    );
                    setContext("tx", { ...request, ...receipt });
                    return receipt.status === "success";
                  } catch (error: unknown) {
                    captureException(error, { level: "error" });
                    return false;
                  }
                }))
              ) {
                return;
              }
              await Promise.allSettled(
                [...assets].map(async (asset) => {
                  await startSpan(
                    { name: "poke account", op: "exa.poke", attributes: { account, asset } },
                    async () => {
                      try {
                        const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                          publicClient.simulateContract({
                            abi: [...exaPluginAbi, ...upgradeableModularAccountAbi, ...auditorAbi, ...marketAbi],
                            account: keeper.account,
                            address: account,
                            ...(asset === ETH
                              ? { functionName: "pokeETH" }
                              : {
                                  functionName: "poke",
                                  args: [marketsByAsset.get(asset)!], // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                }),
                            ...transactionOptions,
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
                        if (receipt.status !== "success") {
                          captureException(new Error("tx reverted"), { level: "error" });
                        }
                      } catch (error: unknown) {
                        if (
                          error instanceof BaseError &&
                          error.cause instanceof ContractFunctionRevertedError &&
                          error.cause.data?.errorName === "NoBalance"
                        ) {
                          return;
                        }
                        captureException(error, { level: "error" });
                      }
                    },
                  );
                }),
              );
            },
          ),
        ),
      ),
    )
      .then((results) => {
        for (const result of results) {
          if (result.status === "rejected") captureException(result.reason);
        }
      })
      .catch((error: unknown) => captureException(error));
    return c.json({});
  },
);
