import MIN_BORROW_INTERVAL from "@exactly/common/MIN_BORROW_INTERVAL";
import {
  exaPluginAbi,
  exaPluginAddress,
  exaPreviewerAbi,
  exaPreviewerAddress,
  upgradeableModularAccountAbi,
  usdcAddress,
} from "@exactly/common/generated/chain";
import { Address, type Hash, type Hex } from "@exactly/common/validation";
import { MATURITY_INTERVAL, splitInstallments } from "@exactly/lib";
import { vValidator } from "@hono/valibot-validator";
import {
  captureException,
  getActiveSpan,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  setContext,
  setTag,
  setUser,
  startSpan,
} from "@sentry/node";
import createDebug from "debug";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import * as v from "valibot";
import {
  decodeErrorResult,
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  erc20Abi,
  keccak256,
  maxUint256,
  padHex,
  toBytes,
} from "viem";

import database, { cards, transactions } from "../database/index";
import { auditorAbi, issuerCheckerAbi, marketAbi, proposalManagerAbi } from "../generated/contracts";
import keeper from "../utils/keeper";
import { sendPushNotification } from "../utils/onesignal";
import { collectors, headerValidator, signIssuerOp } from "../utils/panda";
import publicClient from "../utils/publicClient";
import { track } from "../utils/segment";
import traceClient, { type CallFrame } from "../utils/traceClient";

const debug = createDebug("exa:panda");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const BaseTransaction = v.object({
  id: v.string(),
  type: v.string(),
  spend: v.object({
    amount: v.number(),
    currency: v.literal("usd"),
    cardId: v.string(),
    cardType: v.literal("virtual"),
    localAmount: v.number(),
    localCurrency: v.pipe(v.string(), v.length(3)),
    merchantCity: v.nullish(v.string()),
    merchantCountry: v.nullish(v.string()),
    merchantName: v.string(),
    status: v.picklist(["completed", "declined", "pending", "reversed"]),
  }),
});

const Payload = v.intersect([
  v.variant("action", [
    v.object({ action: v.literal("created") }),
    v.object({
      action: v.literal("updated"),
      body: v.object({
        ...BaseTransaction.entries,
        spend: v.object({
          ...BaseTransaction.entries.spend.entries,
          authorizationUpdateAmount: v.number(),
          status: v.picklist(["declined", "pending", "reversed"]),
        }),
      }),
    }),
    v.object({
      action: v.literal("requested"),
      body: v.object({
        ...BaseTransaction.entries,
        id: v.optional(v.string()),
        spend: v.object({ ...BaseTransaction.entries.spend.entries, status: v.picklist(["declined", "pending"]) }),
      }),
    }),
    v.object({
      action: v.literal("completed"),
      body: v.object({
        ...BaseTransaction.entries,
        spend: v.object({ ...BaseTransaction.entries.spend.entries, status: v.literal("completed") }),
      }),
    }),
  ]),
  v.object({ resource: v.literal("transaction"), body: BaseTransaction }),
]);

function parseBodies(raw: unknown) {
  const payload = v.safeParse(
    v.object({
      bodies: v.array(v.looseObject({})),
    }),
    raw,
  );
  if (!payload.success) throw new Error("invalid transaction payload");
  return payload.output.bodies;
}

export default new Hono().post(
  "/",
  headerValidator(),
  vValidator("json", Payload, (validation, c) => {
    if (debug.enabled) {
      c.req
        .text()
        .then(debug)
        .catch((error: unknown) => captureException(error));
    }
    if (!validation.success) {
      captureException(new Error("bad panda"), { contexts: { validation } });
      return c.json("bad request", 400);
    }
  }),
  async (c) => {
    const payload = c.req.valid("json");
    setTag("panda.event", payload.action);
    setTag("panda.status", payload.body.spend.status);
    const jsonBody = await c.req.json(); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    setContext("panda", jsonBody); // eslint-disable-line @typescript-eslint/no-unsafe-argument

    switch (payload.action) {
      case "requested": {
        const { account, amount, call, transaction } = await prepareCollection(payload);
        if (amount < 0) return c.json("negative amount", 501);
        const authorize = () => {
          try {
            track({
              userId: account,
              event: "TransactionAuthorized",
              properties: { type: "panda", usdAmount: payload.body.spend.amount / 100 },
            });
          } catch (error: unknown) {
            captureException(error, { level: "error" });
          }
          return c.json({});
        };
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "panda.authorization");
        if (!transaction) return authorize();
        try {
          const trace = await startSpan({ name: "debug_traceCall", op: "tx.trace" }, () =>
            traceClient.traceCall({
              from: account,
              to: exaPreviewerAddress,
              data: transaction.data,
              stateOverride: [
                {
                  address: exaPluginAddress,
                  stateDiff: [
                    {
                      slot: keccak256(
                        encodeAbiParameters(
                          [{ type: "address" }, { type: "bytes32" }],
                          [
                            exaPreviewerAddress,
                            keccak256(
                              encodeAbiParameters(
                                [{ type: "bytes32" }, { type: "uint256" }],
                                [keccak256(toBytes("KEEPER_ROLE")), 0n],
                              ),
                            ),
                          ],
                        ),
                      ),
                      value: encodeAbiParameters([{ type: "uint256" }], [1n]),
                    },
                  ],
                },
              ],
            }),
          );
          if (trace.output) {
            let error: string = trace.output;
            try {
              error = decodeErrorResult({
                data: trace.output,
                abi: [
                  ...exaPluginAbi,
                  ...issuerCheckerAbi,
                  ...proposalManagerAbi,
                  ...upgradeableModularAccountAbi,
                  ...auditorAbi,
                  ...marketAbi,
                ],
              }).errorName;
            } catch {} // eslint-disable-line no-empty
            captureException(new Error(error), { contexts: { tx: { call, trace } } });
            return c.json("tx reverted", 550 as UnofficialStatusCode);
          }
          if (
            usdcTransfersToCollectors(trace).reduce(
              (total, { topics, data }) =>
                total + decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data }).args.value,
              0n,
            ) !== amount
          ) {
            debug(`${payload.action}:${payload.body.spend.status}`, payload.body.id, "bad collection");
            captureException(new Error("bad collection"), { level: "warning", contexts: { tx: { call, trace } } });
            return c.json("bad collection", 551 as UnofficialStatusCode);
          }
          return authorize();
        } catch (error: unknown) {
          captureException(error, { contexts: { tx: { call } } });
          return c.json({}, 569 as UnofficialStatusCode);
        }
      }
      case "updated":
      case "created": {
        if (payload.body.spend.status !== "pending") return c.json({});
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, `panda.${payload.action}.clearing`);
        const { account, call, mode } = await prepareCollection(payload);
        if (!call) return c.json({});
        try {
          await keeper.exaSend(
            { name: "collect credit", op: "exa.collect", attributes: { account } },
            {
              address: account,
              abi: [...exaPluginAbi, ...issuerCheckerAbi, ...upgradeableModularAccountAbi, ...auditorAbi, ...marketAbi],
              ...call,
            },
            {
              async onHash(hash) {
                const tx = await database.query.transactions.findFirst({
                  where: and(eq(transactions.id, payload.body.id), eq(transactions.cardId, payload.body.spend.cardId)),
                });
                await (tx
                  ? database
                      .update(transactions)
                      .set({
                        hashes: [...tx.hashes, hash],
                        payload: {
                          ...(tx.payload as object),
                          bodies: [...parseBodies(tx.payload), { ...jsonBody, createdAt: new Date().toISOString() }],
                        },
                      })
                      .where(
                        and(eq(transactions.id, payload.body.id), eq(transactions.cardId, payload.body.spend.cardId)),
                      )
                  : database.insert(transactions).values([
                      {
                        id: payload.body.id,
                        cardId: payload.body.spend.cardId,
                        hashes: [hash],
                        payload: {
                          bodies: [{ ...jsonBody, createdAt: new Date().toISOString() }],
                          type: "panda",
                          merchant: {
                            name: payload.body.spend.merchantName,
                            city: payload.body.spend.merchantCity,
                            country: payload.body.spend.merchantCountry,
                          },
                        },
                      },
                    ]));
              },
            },
          );
          sendPushNotification({
            userId: account,
            headings: { en: "Exa Card Purchase" },
            contents: {
              en: `${(payload.body.spend.localAmount / 100).toLocaleString(undefined, {
                style: "currency",
                currency: payload.body.spend.localCurrency,
              })} at ${payload.body.spend.merchantName.trim()}, paid in ${{ 0: "debit", 1: "credit" }[mode] ?? `${mode} installments`} with USDC`,
            },
          }).catch((error: unknown) => captureException(error, { level: "error" }));
          return c.json({});
        } catch (error: unknown) {
          captureException(error, { level: "fatal", contexts: { tx: { call } } });
          return c.text(error instanceof Error ? error.message : String(error), 569 as UnofficialStatusCode);
        }
      }
      default:
        return c.json({});
    }
  },
);

async function prepareCollection(payload: v.InferOutput<typeof Payload>) {
  const card = await database.query.cards.findFirst({
    columns: { mode: true },
    where: and(eq(cards.id, payload.body.spend.cardId), eq(cards.status, "ACTIVE")),
    with: { credential: { columns: { account: true } } },
  });
  if (!card) throw new Error("card not found");
  const account = v.parse(Address, card.credential.account);
  setUser({ id: account });
  setTag("exa.mode", card.mode);
  const usdAmount =
    (payload.action === "updated" ? payload.body.spend.authorizationUpdateAmount : payload.body.spend.amount) / 100;
  const amount = BigInt(Math.round(usdAmount * 1e6));
  if (amount === 0n) return { account, amount, call: null, transaction: null };
  const call = await (async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signIssuerOp({ account, amount, timestamp }); // TODO replace with payload signature
    if (card.mode === 0) {
      return { functionName: "collectDebit", args: [amount, BigInt(timestamp), signature] } as const;
    }
    const nextMaturity = timestamp - (timestamp % MATURITY_INTERVAL) + MATURITY_INTERVAL;
    const firstMaturity =
      nextMaturity - timestamp < MIN_BORROW_INTERVAL ? nextMaturity + MATURITY_INTERVAL : nextMaturity;
    if (card.mode === 1 || usdAmount < card.mode || payload.action === "requested") {
      return {
        functionName: "collectCredit",
        args: [
          BigInt(firstMaturity + (card.mode - 1) * MATURITY_INTERVAL),
          amount,
          maxUint256,
          BigInt(timestamp),
          signature,
        ],
      } as const;
    }
    const preview = await startSpan({ name: "query onchain state", op: "exa.preview" }, () =>
      publicClient.readContract({
        abi: exaPreviewerAbi,
        address: exaPreviewerAddress,
        functionName: "utilizations",
      }),
    );
    setContext("preview", preview);
    const installments = startSpan({ name: "split installments", op: "exa.split" }, () =>
      splitInstallments(
        amount,
        preview.floatingAssets,
        firstMaturity,
        preview.fixedUtilizations.length,
        preview.fixedUtilizations
          .filter(
            ({ maturity }) => maturity >= firstMaturity && maturity < firstMaturity + card.mode * MATURITY_INTERVAL,
          )
          .map(({ utilization }) => utilization),
        preview.floatingUtilization,
        preview.globalUtilization,
        preview.interestRateModel,
      ),
    );
    setContext("installments", installments);
    return {
      functionName: "collectInstallments",
      args: [BigInt(firstMaturity), installments.amounts, maxUint256, BigInt(timestamp), signature],
    } as const;
  })();
  setContext("tx", { call });
  return {
    account,
    amount,
    call,
    mode: card.mode,
    transaction: {
      from: keeper.account.address,
      to: account,
      data: encodeFunctionData({ abi: exaPluginAbi, ...call }),
    } as const,
  };
}

const collectorTopics = new Set(collectors.map((address) => padHex(address.toLowerCase() as Hex)));
const [transferTopic] = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer" });
const usdcLowercase = usdcAddress.toLowerCase() as Hex;
function usdcTransfersToCollectors({ calls, logs }: CallFrame): TransferLog[] {
  return [
    ...(logs?.filter(
      (log): log is TransferLog =>
        log.address === usdcLowercase &&
        log.topics?.[0] === transferTopic &&
        log.topics[2] !== undefined &&
        collectorTopics.has(log.topics[2]),
    ) ?? []),
    ...(calls?.flatMap(usdcTransfersToCollectors) ?? []),
  ];
}

interface TransferLog {
  address: Hex;
  topics: [Hash, Hash, Hash];
  data: Hex;
  position: Hex;
}
