import { useCallback, useState, useEffect } from "react";
import { Platform } from "react-native";
import { Inquiry } from "react-native-persona";

import handleError from "./handleError";
import type { UserInquiry, Workflow } from "../pomelo/utils/kyc";

async function getUserInquiry({ workflow }: { workflow: Workflow }) {
  const sp = new URLSearchParams({ workflow });
  const response = await fetch("http://localhost:3000/api/kyc?" + sp.toString());
  const kyc = (await response.json()) as UserInquiry;
  return kyc;
}

export default () => {
  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<UserInquiry>();

  useEffect(() => {
    const load = async () => {
      setInquiry(await getUserInquiry({ workflow: Platform.OS === "web" ? "hosted" : "native" }));
    };

    load()
      .catch(handleError)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const native = useCallback(() => {
    if (!inquiry) {
      return;
    }

    Inquiry.fromInquiry(inquiry.id).build().start();
  }, [inquiry]);

  const hosted = useCallback(() => {
    if (!inquiry || !inquiry.url) {
      return;
    }

    window.location.href = inquiry.url;
  }, [inquiry]);

  return [Platform.OS === "web" ? hosted : native, loading] as const;
};
