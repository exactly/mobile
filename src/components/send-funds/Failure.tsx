import { XCircle } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import type { WithdrawDetails } from "./Withdraw";

import Text from "../shared/Text";
import View from "../shared/View";
import Details from "./Details";
import Values from "./Values";

interface FailureProperties {
  details: WithdrawDetails;
  hash?: string;
}

export default function Failure({ details: { amount, assetName, usdValue }, hash }: FailureProperties) {
  return (
    <View>
      <ScrollView>
        <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
          <View gap="$s5" padded>
            <View alignItems="center" gap="$s4">
              <View
                alignItems="center"
                backgroundColor="$interactiveBaseErrorSoftDefault"
                borderRadius="$r_0"
                height={ms(88)}
                justifyContent="center"
                padding="$5"
                width={ms(88)}
              >
                <XCircle color="$interactiveOnBaseErrorSoft" size={ms(56)} />
              </View>
              <Text color="$uiErrorSecondary" title3>
                Transaction failed
              </Text>
            </View>
            <Values amount={amount} assetName={assetName} usdValue={usdValue} />
          </View>
        </View>
        <Details hash={hash} />
        <View alignItems="center" padded>
          <Pressable
            onPress={() => {
              router.back();
            }}
          >
            <Text color="$interactiveBaseBrandDefault" emphasized footnote>
              Close
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
