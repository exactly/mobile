import { exaAccountFactoryAddress, upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import latestExaPlugin from "@exactly/common/latestExaPlugin";
import { Address, type Passkey } from "@exactly/common/validation";
import { router } from "expo-router";
import { Platform } from "react-native";
import { Environment, Inquiry } from "react-native-persona";
import { parse } from "valibot";
import { zeroAddress } from "viem";

import handleError from "./handleError";
import publicClient from "./publicClient";
import queryClient from "./queryClient";
import { getKYCLink } from "./server";
import { accountClient } from "../utils/alchemyConnector";

export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;
const PANDA_TEMPLATE = "itmpl_1igCJVqgf3xuzqKYD87HrSaDavU2";
const CRYPTOMATE_TEMPLATE = "itmpl_8uim4FvD5P3kFpKHX37CW817";

export async function getTemplateId() {
  try {
    const [exaPlugin] = await publicClient.readContract({
      address: accountClient?.account.address ?? zeroAddress,
      abi: upgradeableModularAccountAbi,
      functionName: "getInstalledPlugins",
    });
    return exaPlugin === latestExaPlugin ? PANDA_TEMPLATE : CRYPTOMATE_TEMPLATE;
  } catch {
    return queryClient.getQueryData<Passkey>(["passkey"])?.factory === parse(Address, exaAccountFactoryAddress)
      ? PANDA_TEMPLATE
      : CRYPTOMATE_TEMPLATE;
  }
}

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
    window.open(otl);
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
