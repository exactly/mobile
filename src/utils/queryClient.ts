import type { Address } from "viem";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/query-persist-client-core";
import { QueryClient } from "@tanstack/react-query";
import { deserialize, serialize } from "wagmi";
import { structuralSharing } from "wagmi/query";

import handleError from "./handleError";

export const persister = createAsyncStoragePersister({ deserialize, serialize, storage: AsyncStorage });
const queryClient = new QueryClient({ defaultOptions: { queries: { structuralSharing } } });

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (globalThis.window) {
  persistQueryClientRestore({ persister, queryClient }).catch(handleError);
  persistQueryClientSubscribe({ persister, queryClient });
}

queryClient.setQueryDefaults(["passkey"], {
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  retry: false,
  staleTime: Infinity,
});
queryClient.setQueryDefaults(["settings", "theme"], {
  gcTime: Infinity,
  initialData: undefined,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  staleTime: Infinity,
});
queryClient.setQueryDefaults(["settings", "sensitive"], {
  gcTime: Infinity,
  initialData: false,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  retry: false,
  staleTime: Infinity,
});
queryClient.setQueryDefaults(["settings", "alertShown"], {
  gcTime: Infinity,
  initialData: true,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  retry: false,
  staleTime: Infinity,
});
queryClient.setQueryDefaults(["contacts", "saved"], {
  gcTime: Infinity,
  initialData: undefined,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  retry: false,
  staleTime: Infinity,
});
queryClient.setQueryDefaults(["contacts", "recent"], {
  gcTime: Infinity,
  initialData: undefined,
  queryFn: () => {
    throw new Error("don't refetch");
  },
  retry: false,
  staleTime: Infinity,
});

export default queryClient;

export interface Withdraw {
  amount: bigint;
  market?: Address;
  receiver?: Address;
}
