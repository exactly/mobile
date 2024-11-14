import { router } from "expo-router";
import React from "react";
import { ScrollView } from "tamagui";

import Values from "./Values";
import type { WithdrawDetails } from "./Withdraw";
import Details from "../shared/Details";
import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Pending({
  details: { assetName, amount, usdValue },
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
            <Values amount={amount} assetName={assetName} usdValue={usdValue} />
          </View>
        </View>
        <Details
          hash={hash}
          onClose={() => {
            router.back();
          }}
        />
      </ScrollView>
    </View>
  );
}
