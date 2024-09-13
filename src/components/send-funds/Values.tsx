import React from "react";
import { ms } from "react-native-size-matters";
import { XStack } from "tamagui";

import type { WithdrawDetails } from "./Withdraw";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Values({ amount, assetName, usdValue }: WithdrawDetails) {
  return (
    <View alignItems="center" justifyContent="center">
      <View alignItems="center" gap="$s3_5">
        <XStack alignItems="center" gap="$s3">
          <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
          <Text title color="$uiNeutralPrimary">
            {amount} {assetName}
          </Text>
        </XStack>
        <Text body color="$uiNeutralSecondary">
          {Number(usdValue).toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            currencyDisplay: "narrowSymbol",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </View>
  );
}
