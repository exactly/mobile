import type { Passkey } from "@exactly/common/validation";
import { IdCard } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { YStack } from "tamagui";

import Progression from "./Progression";
import { createInquiry, resumeInquiry } from "../../../utils/persona";
import queryClient from "../../../utils/queryClient";
import reportError from "../../../utils/reportError";
import { APIError, getKYCStatus } from "../../../utils/server";
import Button from "../../shared/Button";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function VerifyIdentity() {
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { mutateAsync: startKYC } = useMutation({
    mutationKey: ["kyc"],
    mutationFn: async () => {
      if (!passkey) throw new Error("missing passkey");
      try {
        const result = await getKYCStatus();
        if (result === "ok") return;
        resumeInquiry(result.inquiryId, result.sessionToken).catch(reportError);
      } catch (error) {
        if (!(error instanceof APIError)) {
          reportError(error);
          return;
        }
        const { code, text } = error;
        if (
          (code === 403 && text === "kyc required") ||
          (code === 404 && text === "kyc not found") ||
          (code === 400 && text === "kyc not started")
        ) {
          createInquiry(passkey).catch(reportError);
        }
        reportError(error);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["card-upgrade"], 1);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kyc", "status"] });
    },
  });
  return (
    <View fullScreen flex={1} gap="$s6" paddingHorizontal="$s5" paddingTop="$s5">
      <YStack gap="$s4">
        <IdCard size={ms(32)} color="$uiBrandSecondary" />
        <Text emphasized title3 color="$uiBrandSecondary">
          Verify your identity
        </Text>
      </YStack>
      <YStack>
        <Text color="$uiNeutralSecondary" subHeadline>
          To upgrade your Exa Card, we first need to verify your identity so you can continue spending your onchain
          assets seamlessly.
        </Text>
      </YStack>

      <Progression />
      <YStack paddingBottom="$s7">
        <Button
          onPress={() => {
            startKYC().catch(reportError);
          }}
          flexBasis={ms(60)}
          contained
          main
          spaced
          fullwidth
          iconAfter={<IdCard strokeWidth={2.5} color="$interactiveOnBaseBrandDefault" />}
        >
          Start verification
        </Button>
      </YStack>
    </View>
  );
}
