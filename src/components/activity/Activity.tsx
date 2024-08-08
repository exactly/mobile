import { A } from "@expo/html-elements";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Environment, Inquiry } from "react-native-persona";
import { ms } from "react-native-size-matters";
import { ScrollView, Spinner } from "tamagui";

import handleError from "../../utils/handleError";
import { kycOTL, kycStatus } from "../../utils/server";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

if (!process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID) throw new Error("missing persona template id");

const templateId = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;

function startOnboarding() {
  router.push("/onboarding");
}

export default function Activity() {
  const queryClient = useQueryClient();
  const {
    data: oneTimeLink,
    refetch: fetchOTL,
    isFetching: isFetchingOTL,
  } = useQuery({ queryKey: ["personaOTL"], enabled: false, queryFn: kycOTL, retry: false });
  const {
    data: passed,
    isFetching: isFetchingStatus,
    refetch: fetchStatus,
  } = useQuery({
    queryKey: ["kycStatus"],
    enabled: !!oneTimeLink,
    queryFn: kycStatus,
    retry: false,
  });

  function handleKYC() {
    const flow = Platform.OS === "web" ? "hosted" : "native";
    if (flow === "native") {
      Inquiry.fromTemplate(templateId)
        .environment(environment)
        .onComplete((inquiryId, status, fields, extraData) => {
          queryClient.setQueryData(["kycStatus"], true);
          // TODO update kyc status in db
        })
        .onError(handleError)
        .build()
        .start();
      return;
    }
    fetchOTL().catch(handleError);
  }

  useEffect(() => {
    fetchStatus().catch(handleError);
  }, [fetchStatus, passed]);
  return (
    <SafeView fullScreen tab>
      <ScrollView>
        <View fullScreen padded>
          <View gap={ms(40)} flex={1}>
            <View gap={ms(10)}>
              <Button contained onPress={startOnboarding}>
                Start Onboarding
              </Button>

              {(isFetchingOTL || isFetchingStatus) && <Spinner color="$interactiveBaseBrandDefault" />}

              {!isFetchingOTL && oneTimeLink && (
                <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
                  <A href={oneTimeLink}>
                    <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
                      {oneTimeLink}
                    </Text>
                  </A>
                </View>
              )}

              <Button contained disabled={passed || isFetchingStatus} onPress={handleKYC}>
                {passed ? "KYC Complete" : "Start KYC"}
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
