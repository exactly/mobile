import type { Passkey } from "@exactly/common/validation";
import { Platform } from "react-native";
import { Environment, Inquiry } from "react-native-persona";

import handleError from "./handleError";
import queryClient from "./queryClient";
import { kyc } from "./server";

export const templateId = "itmpl_8uim4FvD5P3kFpKHX37CW817";
export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;

export async function verifyIdentity(passkey: Passkey) {
  if (Platform.OS === "web") {
    const otl = await kyc();
    window.open(otl, "_self");
    return;
  }
  Inquiry.fromTemplate(templateId)
    .environment(environment)
    .referenceId(passkey.credentialId)
    .onCanceled((inquiryId) => {
      if (!inquiryId) throw new Error("no inquiry id");
      kyc(inquiryId).catch(handleError);
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
    })
    .onComplete((inquiryId) => {
      if (!inquiryId) throw new Error("no inquiry id");
      kyc(inquiryId).catch(handleError);
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
    })
    .onError(handleError)
    .build()
    .start();
}
