import { XCircle } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Values from "./Values";
import type { WithdrawDetails } from "./Withdraw";
import queryClient from "../../utils/queryClient";
import Details from "../shared/Details";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Failure({
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
                backgroundColor="$interactiveBaseErrorSoftDefault"
                width={ms(88)}
                height={ms(88)}
                justifyContent="center"
                alignItems="center"
                borderRadius="$r_0"
                padding="$5"
              >
                <XCircle size={ms(56)} color="$interactiveOnBaseErrorSoft" />
              </View>
              <Text title3 color="$uiErrorSecondary">
                Transaction failed
              </Text>
            </View>
            <Values amount={amount} assetName={assetName} usdValue={usdValue} />
          </View>
        </View>
        <Details
          hash={hash}
          onClose={() => {
            queryClient.setQueryData(["withdrawal"], { receiver: undefined, market: undefined, amount: 0n });
            router.replace("/");
          }}
        />
        <View padded alignItems="center">
          <Pressable
            onPress={() => {
              router.back();
            }}
          >
            <Text emphasized footnote color="$interactiveBaseBrandDefault">
              Close
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
