import type * as IntercomNative from "@intercom/intercom-react-native";
import type * as IntercomWeb from "@intercom/messenger-js-sdk";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import handleError from "./handleError";

const appId = process.env.EXPO_PUBLIC_INTERCOM_APP_ID;

const { login, present, presentContent } = (
  Platform.OS === "web"
    ? () => {
        const { Intercom, showArticle, showSpace } = require("@intercom/messenger-js-sdk") as typeof IntercomWeb; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        return {
          login: (userId?: string) => {
            if (!appId) return Promise.resolve(false);
            Intercom({ app_id: appId, ...(userId && { user_id: userId }) });
            return Promise.resolve(true);
          },
          present: () => {
            showSpace("home");
            return Promise.resolve(true);
          },
          presentContent: (articleId: string) => {
            showArticle(articleId);
            return Promise.resolve(true);
          },
        };
      }
    : () => {
        const {
          default: Intercom,
          IntercomContent,
          Space,
        } = require("@intercom/intercom-react-native") as typeof IntercomNative; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        return {
          login: (userId: string) =>
            appId ? Intercom.loginUserWithUserAttributes({ userId }) : Promise.resolve(false),
          present: () => Intercom.presentSpace(Space.home),
          presentContent: (articleId: string) =>
            Intercom.presentContent(IntercomContent.articleWithArticleId(articleId)),
        };
      }
)();

export default function useIntercom(userId?: string) {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    if (!userId || loggedIn) return;
    login(userId).then(setLoggedIn).catch(handleError);
  }, [userId, loggedIn]);
  return { loggedIn, present, presentContent };
}
