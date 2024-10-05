import React from "react";
import { ScrollView } from "tamagui";

import type { WithdrawDetails } from "./Withdraw";

import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";
import Details from "./Details";
import Values from "./Values";

interface PendingProperties {
  details: WithdrawDetails;
  hash?: string;
}

export default function Pending({ details: { amount, assetName, usdValue }, hash }: PendingProperties) {
  return (
    <View>
      <ScrollView>
        <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
          <View gap="$s5" padded>
            <View alignItems="center" gap="$s4">
              <Spinner />
              <Text color="$uiNeutralSecondary" title3>
                Sending...
              </Text>
            </View>
            <Values amount={amount} assetName={assetName} usdValue={usdValue} />
          </View>
        </View>
        <Details hash={hash} />
      </ScrollView>
    </View>
  );
}
