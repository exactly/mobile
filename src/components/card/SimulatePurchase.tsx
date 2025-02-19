import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { WAD } from "@exactly/lib";
import { ChevronDown } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { ms } from "react-native-size-matters";
import { Accordion, Separator, Spinner, Square, XStack, YStack } from "tamagui";
import { formatUnits, parseUnits, zeroAddress } from "viem";

import { useReadPreviewerPreviewBorrowAtMaturity } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useAsset from "../../utils/useAsset";
import useInstallments from "../../utils/useInstallments";
import TamaguiInput from "../shared/TamaguiInput";
import Text from "../shared/Text";

export default function SimulatePurchase({ installments }: { installments: number }) {
  const [input, setInput] = useState("100");
  const [assets, setAssets] = useState(100n);
  const {
    data: installmentsResult,
    firstMaturity,
    timestamp,
    isFetching: isInstallmentsFetching,
  } = useInstallments({ totalAmount: assets, installments });
  const { market, account } = useAsset(marketUSDCAddress);
  const {
    data: borrowPreview,
    isFetching: isFetchingBorrowPreview,
    isRefetching: isRefetchingBorrowPreview,
    refetch: refetchBorrowPreview,
  } = useReadPreviewerPreviewBorrowAtMaturity({
    address: previewerAddress,
    args: [market?.market ?? zeroAddress, BigInt(firstMaturity), assets],
    query: { enabled: !!market && !!account && !!firstMaturity && assets > 0n },
  });
  const isLoading = isInstallmentsFetching || isFetchingBorrowPreview || isRefetchingBorrowPreview;
  useEffect(() => {
    const value = parseUnits(input.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), 6);
    setAssets(value);
  }, [input]);
  useEffect(() => {
    if (!isInstallmentsFetching) return;
    refetchBorrowPreview().catch(handleError);
  }, [isInstallmentsFetching, refetchBorrowPreview]);
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
                  Fixed Borrow APR
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
                  Total interest
                </Text>
                <Text primary headline maxWidth="50%" flexShrink={1}>
                  {installments > 1 && installmentsResult
                    ? Number(
                        formatUnits(
                          installmentsResult.installments.reduce((accumulator, current) => accumulator + current, 0n) -
                            assets,
                          6,
                        ),
                      ).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                      })
                    : installments === 1 && borrowPreview
                      ? Number(formatUnits(borrowPreview.assets - assets, 6)).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
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
                  Total cost
                </Text>
                <Text headline primary textAlign="right">
                  {installments > 1 && installmentsResult
                    ? installmentsResult.installments
                        .reduce((accumulator, current) => accumulator + Number(formatUnits(current, 6)), 0)
                        .toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })
                    : installments === 1 && borrowPreview
                      ? Number(formatUnits(borrowPreview.assets, 6)).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })
                      : "N/A"}
                </Text>
              </XStack>
              <XStack alignItems="center" justifyContent="space-between" width="100%">
                <Text primary subHeadline>
                  First due date
                </Text>
                <Text headline>{format(new Date(Number(firstMaturity) * 1000), "yyyy-MM-dd")}</Text>
              </XStack>
              <Separator height={1} borderColor="$borderNeutralSoft" />
              <XStack>
                <Text primary subHeadline>
                  You&apos;ll pay{" "}
                  <Text emphasized>
                    {installments} {installments === 1 ? "installment" : "installments"} of{" "}
                    {installments > 1 && installmentsResult
                      ? Number(formatUnits(installmentsResult.installments[0] ?? 0n, 6)).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })
                      : installments === 1 && borrowPreview
                        ? Number(formatUnits(borrowPreview.assets, 6)).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })
                        : "N/A"}
                  </Text>
                  , starting on{" "}
                  <Text emphasized>{format(new Date(Number(firstMaturity) * 1000), "MMMM dd, yyyy")}</Text> with a{" "}
                  <Text emphasized>
                    total cost of{" "}
                    {installments > 1 && installmentsResult
                      ? installmentsResult.installments
                          .reduce((accumulator, current) => accumulator + Number(formatUnits(current, 6)), 0)
                          .toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })
                      : installments === 1 && borrowPreview
                        ? Number(formatUnits(borrowPreview.assets, 6)).toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                          })
                        : "N/A"}
                  </Text>
                </Text>
              </XStack>
            </YStack>
          </Accordion.Content>
        </Accordion.HeightAnimator>
      </Accordion.Item>
    </Accordion>
  );
}

const exitStyle = { opacity: 0 };
