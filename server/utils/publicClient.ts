import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { getActiveSpan } from "@sentry/node";
import { inspect } from "node:util";
import { array, object, optional, parse, string, unknown } from "valibot";
import { createPublicClient, http } from "viem";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createPublicClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`, {
    batch: true,
    async onFetchRequest(request) {
      const span = getActiveSpan();
      if (span) {
        for (const [index, { method, params }] of parse(Requests, await request.json()).entries()) {
          span.setAttribute(
            `eth[${Date.now()}][${index}]`,
            `${method}(${
              params
                ?.map((p) =>
                  inspect(p, {
                    colors: false,
                    breakLength: Infinity,
                    numericSeparator: true,
                    maxStringLength: null,
                    maxArrayLength: null,
                    depth: null,
                  }),
                )
                .join(", ") ?? ""
            })`,
          );
        }
      }
    },
  }),
});

const Requests = array(object({ method: string(), params: optional(array(unknown())) }));
