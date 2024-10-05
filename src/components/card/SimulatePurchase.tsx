import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import MATURITY_INTERVAL from "@exactly/common/MATURITY_INTERVAL";
import MIN_BORROW_INTERVAL from "@exactly/common/MIN_BORROW_INTERVAL";
import { Calculator } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { ms } from "react-native-size-matters";
import { Spinner, XStack, YStack } from "tamagui";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerPreviewBorrowAtMaturity } from "../../generated/contracts";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import WAD from "../../utils/WAD";
import InfoCard from "../home/InfoCard";
import TamaguiInput from "../shared/TamaguiInput";
import Text from "../shared/Text";

export default function SimulatePurchase() {
  const { data: assets } = useQuery<bigint>({
    gcTime: Infinity,
    initialData: 100n,
    queryKey: ["purchase", "simulation"],
    staleTime: Infinity,
  });
  const { market } = useMarketAccount(marketUSDCAddress);
  const { address } = useAccount();
  const [input, setInput] = useState("100");

  const timestamp = Math.floor(new Date(Date.now()).getTime() / 1000);
  const maturity = timestamp - (timestamp % MATURITY_INTERVAL) + MATURITY_INTERVAL;

  const { data: borrowPreview, isLoading } = useReadPreviewerPreviewBorrowAtMaturity({
    account: address,
    address: previewerAddress,
    args: [
      market?.market ?? zeroAddress,
      BigInt(maturity - timestamp < MIN_BORROW_INTERVAL ? maturity + MATURITY_INTERVAL : maturity),
      assets,
    ],
    query: { enabled: !!market && !!address && !!maturity && assets > 0n },
  });

  useEffect(() => {
    queryClient.setQueryData<bigint>(
      ["purchase", "simulation"],
      parseUnits(input.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), market?.decimals ?? 18),
    );
  }, [input, market?.decimals]);

  return (
    <InfoCard
      renderAction={isLoading ? <Spinner color="$uiNeutralSecondary" /> : <Calculator color="$uiNeutralSecondary" />}
      title="Simulate purchase"
    >
      <YStack gap="$s4_5">
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Total
          </Text>
          <XStack alignItems="center" gap="$s2" justifyContent="flex-end" maxWidth="50%">
            <TamaguiInput backgroundColor="$backgroundMild" borderRadius="$r3">
              <TamaguiInput.Icon>
                <Text primary title3>
                  $
                </Text>
              </TamaguiInput.Icon>
              <TamaguiInput.Input
                fontSize={ms(20)}
                inputMode="decimal"
                letterSpacing={ms(-0.2)}
                lineHeight={ms(25)}
                maxLength={10}
                numberOfLines={1}
                onChangeText={(text) => {
                  setInput(text);
                }}
                textAlign="right"
                value={input}
              />
            </TamaguiInput>
          </XStack>
        </XStack>
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Fixed APR
          </Text>
          <Text flexShrink={1} headline maxWidth="50%" primary>
            {borrowPreview
              ? (
                  Number(
                    ((borrowPreview.assets - assets) * WAD * 31_536_000n) /
                      (assets * (borrowPreview.maturity - BigInt(timestamp))),
                  ) / 1e18
                ).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                  style: "percent",
                })
              : "N/A"}
          </Text>
        </XStack>
        <XStack alignItems="center" justifyContent="space-between" width="100%">
          <Text primary subHeadline>
            Installments
          </Text>
          <XStack alignItems="center" gap="$s2">
            <Text color="$backgroundBrand" headline textAlign="right">
              1x
            </Text>
            <Text headline primary textAlign="right">
              {borrowPreview
                ? Number(formatUnits(borrowPreview.assets, market?.decimals ?? 18)).toLocaleString(undefined, {
                    currency: "USD",
                    style: "currency",
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
