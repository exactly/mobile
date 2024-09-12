import React from "react";
import { ms } from "react-native-size-matters";
import { XStack } from "tamagui";

import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";
import View from "../shared/View";

interface ValuesProperties {
  amount: bigint;
  assetName?: string;
  usdValue: bigint;
}

export default function Values({ amount, assetName, usdValue }: ValuesProperties) {
  return (
    <View alignItems="center" justifyContent="center">
      <View alignItems="center" gap="$s3_5">
        <XStack alignItems="center" gap="$s3">
          <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
          <Text title color="$uiNeutralPrimary">
            {(Number(amount) / 1e18).toString()} {assetName}
          </Text>
        </XStack>
        <Text body color="$uiNeutralSecondary">
          {(Number(usdValue) / 1e18).toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            currencyDisplay: "narrowSymbol",
          })}
        </Text>
      </View>
    </View>
  );
}
