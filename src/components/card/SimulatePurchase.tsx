import { WAD } from "@exactly/lib";
import { Calculator } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { ms } from "react-native-size-matters";
import { Spinner, XStack, YStack } from "tamagui";
import { formatUnits, parseUnits } from "viem";

import InfoCard from "../home/InfoCard";
import TamaguiInput from "../shared/TamaguiInput";
import Text from "../shared/Text";

export default function SimulatePurchase({
  borrowPreview,
  timestamp,
  onAssetsChange,
  isLoading,
}: {
  borrowPreview?: { maturity: bigint; assets: bigint; utilization: bigint };
  timestamp: number;
  onAssetsChange: (assets: bigint) => void;
  isLoading: boolean;
}) {
  const [input, setInput] = useState("100");
  const [assets, setAssets] = useState(100n);
  useEffect(() => {
    const value = parseUnits(input.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), 6);
    setAssets(value);
    onAssetsChange(value);
  }, [input, onAssetsChange]);
  return (
    <InfoCard
      title="Simulate purchase"
      renderAction={isLoading ? <Spinner color="$uiNeutralSecondary" /> : <Calculator color="$uiNeutralSecondary" />}
    >
      <YStack gap="$s4_5">
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Total
          </Text>
          <XStack alignItems="center" gap="$s2" justifyContent="flex-end" maxWidth="50%">
            <TamaguiInput borderRadius="$r3" backgroundColor="$backgroundMild">
              <TamaguiInput.Icon>
                <Text primary title3>
                  $
                </Text>
              </TamaguiInput.Icon>
              <TamaguiInput.Input
                maxLength={10}
                numberOfLines={1}
                inputMode="decimal"
                textAlign="right"
                fontSize={ms(20)}
                lineHeight={ms(25)}
                letterSpacing={ms(-0.2)}
                value={input}
                onChangeText={(text) => {
                  setInput(text);
                }}
              />
            </TamaguiInput>
          </XStack>
        </XStack>
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Fixed APR
          </Text>
          <Text primary headline maxWidth="50%" flexShrink={1}>
            {borrowPreview
              ? (
                  Number(
                    ((borrowPreview.assets - assets) * WAD * 31_536_000n) /
                      (assets * (borrowPreview.maturity - BigInt(timestamp))),
                  ) / 1e18
                ).toLocaleString(undefined, {
                  style: "percent",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "N/A"}
          </Text>
        </XStack>
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Installments
          </Text>
          <XStack alignItems="center" gap="$s2">
            <Text headline color="$backgroundBrand" textAlign="right">
              1x
            </Text>
            <Text headline primary textAlign="right">
              {borrowPreview
                ? Number(formatUnits(borrowPreview.assets, 6)).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })
                : "N/A"}
            </Text>
          </XStack>
        </XStack>
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            First due date
          </Text>
          <Text headline>
            {borrowPreview ? format(new Date(Number(borrowPreview.maturity) * 1000), "yyyy-MM-dd") : "N/A"}
          </Text>
        </XStack>
      </YStack>
    </InfoCard>
  );
}
