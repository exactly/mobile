import { CheckCircle2, Loader } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Details from "./Details";
import Values from "./Values";
import type { WithdrawDetails } from "./Withdraw";
import queryClient from "../../utils/queryClient";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Success({
  details: { assetName, amount, usdValue, isExternalAsset },
  hash,
}: {
  details: WithdrawDetails;
  hash?: string;
}) {
  return (
    <View>
      <ScrollView>
        <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
          <View padded gap="$s5">
            <View gap="$s4" alignItems="center">
              <View
                backgroundColor={
                  isExternalAsset ? "$interactiveBaseSuccessSoftDefault" : "$interactiveBaseInformationSoftDefault"
                }
                width={ms(88)}
                height={ms(88)}
                justifyContent="center"
                alignItems="center"
                borderRadius="$r_0"
                padding="$5"
              >
                {isExternalAsset ? (
                  <CheckCircle2 size={ms(56)} color="$interactiveOnBaseSuccessSoft" />
                ) : (
                  <Loader size={ms(56)} color="$interactiveOnBaseInformationSoft" />
                )}
              </View>
              <Text title3 color={isExternalAsset ? "$uiSuccessSecondary" : "$uiInfoSecondary"}>
                {isExternalAsset ? "Successfully sent" : "Processing withdrawal"}
              </Text>
            </View>
            <Values amount={amount} assetName={assetName} usdValue={usdValue} isExternalAsset={isExternalAsset} />
          </View>
        </View>
        <Details
          isExternalAsset={isExternalAsset}
          hash={hash}
          onClose={() => {
            queryClient.setQueryData(["withdrawal"], { receiver: undefined, market: undefined, amount: 0n });
            router.replace(isExternalAsset ? "/" : "/(app)/pending-proposals");
          }}
        />
      </ScrollView>
    </View>
  );
}
