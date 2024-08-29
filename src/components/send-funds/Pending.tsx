import React from "react";
import { ScrollView } from "tamagui";

import Details from "./Details";
import Values from "./Values";
import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";

interface PendingProperties {
  details: { assetName?: string; amount: bigint; usdValue: bigint };
  hash?: string;
}

export default function Pending({ details: { assetName, amount, usdValue }, hash }: PendingProperties) {
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
        <Details hash={hash} />
      </ScrollView>
    </View>
  );
}
