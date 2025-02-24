import { upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import latestExaPlugin from "@exactly/common/latestExaPlugin";
import type { Passkey } from "@exactly/common/validation";
import { router } from "expo-router";
import { Platform } from "react-native";
import { Environment, Inquiry } from "react-native-persona";
import { zeroAddress } from "viem";

import handleError from "./handleError";
import publicClient from "./publicClient";
import queryClient from "./queryClient";
import { getKYCLink } from "./server";
import { accountClient } from "../utils/alchemyConnector";

export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;

export async function getTemplateId() {
  const [exaPlugin] = await publicClient.readContract({
    address: accountClient?.account.address ?? zeroAddress,
    abi: upgradeableModularAccountAbi,
    functionName: "getInstalledPlugins",
  });
  return exaPlugin === latestExaPlugin ? "itmpl_1igCJVqgf3xuzqKYD87HrSaDavU2" : "itmpl_8uim4FvD5P3kFpKHX37CW817"; // cspell:disable-line
}

export async function createInquiry(passkey: Passkey) {
  if (Platform.OS === "web") {
    const otl = await getKYCLink();
    window.open(otl, "_blank");
    return;
  }

  Inquiry.fromTemplate(await getTemplateId())
    .environment(environment)
    .referenceId(passkey.credentialId)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(app)/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(app)/(home)");
    })
    .onError(handleError)
    .build()
    .start();
}

export async function resumeInquiry(inquiryId: string, sessionToken: string) {
  if (Platform.OS === "web") {
    const otl = await getKYCLink();
    window.open(otl, "_blank");
    return;
  }

  Inquiry.fromInquiry(inquiryId)
    .sessionToken(sessionToken)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(app)/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(app)/(home)");
    })
    .build()
    .start();
}
