import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/query-persist-client-core";
import { QueryClient } from "@tanstack/react-query";
import { deserialize, serialize } from "wagmi";

import handleError from "./handleError";

export const persister = createAsyncStoragePersister({ serialize, deserialize, storage: AsyncStorage });
const queryClient = new QueryClient();

if (typeof window !== "undefined") {
  persistQueryClientRestore({ queryClient, persister }).catch(handleError);
  persistQueryClientSubscribe({ queryClient, persister });
}

queryClient.setQueryDefaults(["passkey"], { retry: false, staleTime: Infinity, gcTime: Infinity });
queryClient.setQueryDefaults(["auth"], { retry: false, staleTime: 24 * 60 * 60_000, gcTime: 24 * 60 * 60_000 });

export default queryClient;
