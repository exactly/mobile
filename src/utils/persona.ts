import type { Passkey } from "@exactly/common/validation";
import { router } from "expo-router";
import { Environment, Inquiry } from "react-native-persona";

import handleError from "./handleError";
import queryClient from "./queryClient";

export const templateId = "itmpl_8uim4FvD5P3kFpKHX37CW817";
export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;

export function createInquiry(passkey: Passkey) {
  Inquiry.fromTemplate(templateId)
    .environment(environment)
    .referenceId(passkey.credentialId)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(home)");
    })
    .onError(handleError)
    .build()
    .start();
}

export function resumeInquiry(inquiryId: string, sessionToken: string) {
  Inquiry.fromInquiry(inquiryId)
    .sessionToken(sessionToken)
    .onCanceled(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(home)");
    })
    .onComplete(() => {
      queryClient.invalidateQueries({ queryKey: ["kyc", "status"] }).catch(handleError);
      router.replace("/(home)");
    })
    .build()
    .start();
}
