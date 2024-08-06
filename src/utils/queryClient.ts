import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { deserialize, serialize } from "wagmi";

import loadPasskey from "./loadPasskey";

export const persister = createAsyncStoragePersister({ serialize, deserialize, storage: AsyncStorage });

const queryClient = new QueryClient();

queryClient.setQueryDefaults(["passkey"], { queryFn: loadPasskey, retry: false, staleTime: Infinity });
queryClient.prefetchQuery({ queryKey: ["passkey"] }).catch(() => {});

export default queryClient;
