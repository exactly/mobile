import { marketUSDCAddress } from "@exactly/common/generated/chain";
import { borrowLimit } from "@exactly/lib";
import { ArrowRight } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Separator, XStack } from "tamagui";

import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import useMarketAccount from "../../utils/useMarketAccount";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CreditLimit() {
  const { presentContent } = useIntercom();
  const { market } = useMarketAccount(marketUSDCAddress);
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s4">
      <View flexDirection="row" gap="$s3" alignItems="center" justifyContent="space-between">
        <Text emphasized headline flex={1}>
          Credit card limit
        </Text>
      </View>
      <View gap="$s4">
        <View gap="$s3">
          <Text sensitive color="$uiNeutralPrimary" fontFamily="$mono" fontSize={ms(30)}>
            {(market
              ? Number(borrowLimit([market], marketUSDCAddress, Math.floor(new Date(Date.now()).getTime() / 1000))) /
                10 ** market.decimals
              : 0
            ).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
          <Separator borderColor="$borderNeutralSoft" />
        </View>

        <XStack
          justifyContent="space-between"
          alignItems="center"
          hitSlop={ms(15)}
          onPress={() => {
            presentContent("9467331").catch(handleError);
          }}
        >
          <Text secondary caption>
            Learn more about your credit card limit
          </Text>
          <ArrowRight color="$uiNeutralSecondary" size={ms(16)} />
        </XStack>
      </View>
    </View>
  );
}
