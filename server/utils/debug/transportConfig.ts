import createDebug from "debug";
import type { HttpTransportConfig } from "viem";

const debug = createDebug("exa:server:rpc");

const transportConfig: HttpTransportConfig = {
  async onFetchRequest(request) {
    const { method, params } = (await request.json()) as { method?: string; params?: unknown[] };
    if (!method) return;
    debug(method, JSON.stringify(params));
  },
};

export default transportConfig;
