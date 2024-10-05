import { CheckCircle2 } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import type { WithdrawDetails } from "./Withdraw";

import Text from "../shared/Text";
import View from "../shared/View";
import Details from "./Details";
import Values from "./Values";

interface SuccessProperties {
  details: WithdrawDetails;
  hash?: string;
}

export default function Success({ details: { amount, assetName, usdValue }, hash }: SuccessProperties) {
  return (
    <View>
      <ScrollView>
        <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
          <View gap="$s5" padded>
            <View alignItems="center" gap="$s4">
              <View
                alignItems="center"
                backgroundColor="$interactiveBaseSuccessSoftDefault"
                borderRadius="$r_0"
                height={ms(88)}
                justifyContent="center"
                padding="$5"
                width={ms(88)}
              >
                <CheckCircle2 color="$interactiveOnBaseSuccessSoft" size={ms(56)} />
              </View>
              <Text color="$uiSuccessSecondary" title3>
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
