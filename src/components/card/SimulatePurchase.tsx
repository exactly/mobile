import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { WAD } from "@exactly/lib";
import { ChevronDown } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { ms } from "react-native-size-matters";
import { Accordion, Spinner, Square, XStack, YStack } from "tamagui";
import { formatUnits, parseUnits, zeroAddress } from "viem";

import { useReadPreviewerPreviewBorrowAtMaturity } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useInstallments from "../../utils/useInstallments";
import useMarketAccount from "../../utils/useMarketAccount";
import TamaguiInput from "../shared/TamaguiInput";
import Text from "../shared/Text";

export default function SimulatePurchase({ installments }: { installments: number }) {
  const [input, setInput] = useState("100");
  const [assets, setAssets] = useState(100n);
  const {
    data: installmentsResult,
    nextMaturity,
    timestamp,
    isLoading: isInstallmentsLoading,
  } = useInstallments({ totalAmount: assets, installments });
  const { market, account } = useMarketAccount(marketUSDCAddress);
  const {
    data: borrowPreview,
    isFetching: isFetchingBorrowPreview,
    isRefetching: isRefetchingBorrowPreview,
    refetch: refetchBorrowPreview,
  } = useReadPreviewerPreviewBorrowAtMaturity({
    address: previewerAddress,
    account,
    args: [market?.market ?? zeroAddress, BigInt(nextMaturity), assets],
    query: { enabled: !!market && !!account && !!nextMaturity && assets > 0n },
  });
  const isLoading = isInstallmentsLoading || isFetchingBorrowPreview || isRefetchingBorrowPreview;
  useEffect(() => {
    const value = parseUnits(input.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), 6);
    setAssets(value);
  }, [input]);
  useEffect(() => {
    if (!isInstallmentsLoading) return;
    refetchBorrowPreview().catch(handleError);
  }, [isInstallmentsLoading, refetchBorrowPreview]);
  return (
    <Accordion overflow="hidden" type="multiple" backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4">
      <Accordion.Item value="a1" flex={1}>
        <Accordion.Trigger
          unstyled
          flexDirection="row"
          justifyContent="space-between"
          backgroundColor="transparent"
          borderWidth={0}
          alignItems="center"
        >
          {({ open }: { open: boolean }) => (
            <>
              <Text emphasized headline>
                Purchase simulator
              </Text>
              {isLoading ? (
                <Spinner color="$interactiveTextBrandDefault" />
              ) : (
                <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                  <ChevronDown size={ms(24)} color="$interactiveTextBrandDefault" />
                </Square>
              )}
            </>
          )}
        </Accordion.Trigger>
        <Accordion.HeightAnimator animation="quick">
          <Accordion.Content exitStyle={exitStyle} gap="$s4" paddingTop="$s4">
            <YStack gap="$s4_5">
              <XStack alignItems="center" justifyContent="space-between" width="100%">
                <Text primary subHeadline>
                  Total
                </Text>
                <XStack alignItems="center" gap="$s2" justifyContent="flex-end" maxWidth="50%">
                  <TamaguiInput borderRadius="$r3" backgroundColor="$backgroundMild">
                    <TamaguiInput.Icon>
                      <Text primary title3>
                        {(0)
                          .toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })
                          .replaceAll(/\d/g, "")
                          .trim()}
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
                  {installments > 1
                    ? installmentsResult
                      ? (Number(installmentsResult.effectiveRate) / 1e18).toLocaleString(undefined, {
                          style: "percent",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "N/A"
                    : borrowPreview
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
                    {installments > 0 ? `${installments}x` : "N/A"}
                  </Text>
                  <Text headline primary textAlign="right">
                    {installments > 1
                      ? installmentsResult
                        ? Number(formatUnits(installmentsResult.installments[0] ?? 0n, 6)).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })
                        : "N/A"
                      : borrowPreview
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
                <Text headline>{format(new Date(Number(nextMaturity) * 1000), "yyyy-MM-dd")}</Text>
              </XStack>
            </YStack>
          </Accordion.Content>
        </Accordion.HeightAnimator>
      </Accordion.Item>
    </Accordion>
  );
}

const exitStyle = { opacity: 0 };
