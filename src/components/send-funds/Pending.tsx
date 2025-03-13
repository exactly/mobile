import { router } from "expo-router";
import React from "react";
import { ScrollView } from "tamagui";

import Details from "./Details";
import Values from "./Values";
import type { WithdrawDetails } from "./Withdraw";
import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Pending({
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
              <Spinner />
              <Text title3 color="$uiNeutralSecondary">
                Sending...
              </Text>
            </View>
            <Values amount={amount} assetName={assetName} usdValue={usdValue} isExternalAsset={false} />
          </View>
        </View>
        <Details
          isExternalAsset={isExternalAsset}
          hash={hash}
          onClose={() => {
            router.back();
          }}
        />
      </ScrollView>
    </View>
  );
}
