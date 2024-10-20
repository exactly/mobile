import { CheckCircle2 } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Details from "./Details";
import Values from "./Values";
import type { WithdrawDetails } from "./Withdraw";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Success({
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
              <View
                backgroundColor="$interactiveBaseSuccessSoftDefault"
                width={ms(88)}
                height={ms(88)}
                justifyContent="center"
                alignItems="center"
                borderRadius="$r_0"
                padding="$5"
              >
                <CheckCircle2 size={ms(56)} color="$interactiveOnBaseSuccessSoft" />
              </View>
              <Text title3 color="$uiSuccessSecondary">
                Successfully sent
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
