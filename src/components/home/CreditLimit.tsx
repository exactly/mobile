import { previewerAddress, usdcAddress } from "@exactly/common/generated/chain";
import { ArrowRight } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Separator, XStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CreditLimit() {
  const { address } = useAccount();
  const { presentContent } = useIntercom();
  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
    args: [address ?? zeroAddress],
  });
  let creditLimit = 0n;
  if (markets) {
    const usdcMarket = markets.find((market) => market.asset === usdcAddress);
    if (!usdcMarket) return;
    creditLimit = (usdcMarket.maxBorrowAssets * usdcMarket.usdPrice) / 10n ** BigInt(usdcMarket.decimals);
  }
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" gap="$s4" padding="$s4">
      <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-between">
        <Text emphasized flex={1} headline>
          Credit card limit
        </Text>
      </View>
      <View gap="$s4">
        <View gap="$s3">
          <Text color="$uiNeutralPrimary" fontFamily="$mono" fontSize={ms(30)} sensitive>
            {(Number(creditLimit) / 1e18).toLocaleString(undefined, {
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              style: "currency",
            })}
          </Text>
          <Separator borderColor="$borderNeutralSoft" />
        </View>

        <XStack
          alignItems="center"
          hitSlop={ms(15)}
          justifyContent="space-between"
          onPress={() => {
            presentContent("9467331").catch(handleError);
          }}
        >
          <Text caption secondary>
            Learn more about your credit card limit
          </Text>
          <ArrowRight color="$uiNeutralSecondary" size={ms(16)} />
        </XStack>
      </View>
    </View>
  );
}
