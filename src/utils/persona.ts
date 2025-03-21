import type { Passkey } from "@exactly/common/validation";
import { router } from "expo-router";
import { Platform } from "react-native";
import { Environment, Inquiry } from "react-native-persona";

import queryClient from "./queryClient";
import reportError from "./reportError";
import { getKYCLink, getTemplateId } from "./server";

export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;

export async function createInquiry(passkey: Passkey) {
  if (Platform.OS === "web") {
    const otl = await getKYCLink();
    window.open(otl);
    return;
  }

  Inquiry.fromTemplate(await getTemplateId())
    .environment(environment)
    .referenceId(passkey.credentialId)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(reportError);
      router.replace("/(app)/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(reportError);
      router.replace("/(app)/(home)");
    })
    .onError(reportError)
    .build()
    .start();
}

export async function resumeInquiry(inquiryId: string, sessionToken: string) {
  if (Platform.OS === "web") {
    const otl = await getKYCLink();
    window.open(otl);
    return;
  }

  Inquiry.fromInquiry(inquiryId)
    .sessionToken(sessionToken)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(reportError);
      router.replace("/(app)/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(reportError);
      router.replace("/(app)/(home)");
    })
    .build()
    .start();
}
