import fixedRate from "@exactly/common/fixedRate";
import { exaPluginAbi, marketUSDCAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { WAD, withdrawLimit } from "@exactly/lib";
import { ArrowLeft, ChevronRight, Coins } from "@tamagui/lucide-icons";
import { format, formatDistance, isAfter } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ms } from "react-native-size-matters";
import { ScrollView, Separator, Spinner, XStack, YStack } from "tamagui";
import { titleCase } from "title-case";
import { nonEmpty, parse, pipe, safeParse, string } from "valibot";
import { zeroAddress } from "viem";
import { useSimulateContract, useWriteContract } from "wagmi";

import AssetSelectionSheet from "./AssetSelectionSheet";
import Failure from "./Failure";
import Pending from "./Pending";
import Success from "./Success";
import Button from "../../components/shared/Button";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";
import { auditorAbi, marketAbi } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import AssetLogo from "../shared/AssetLogo";

export default function Pay() {
  const insets = useSafeAreaInsets();
  const [assetSelectionOpen, setAssetSelectionOpen] = useState(false);
  const { account, market: USDCMarket, markets, queryKey: marketAccount } = useMarketAccount(marketUSDCAddress);

  const [selectedMarket, setSelectedMarket] = useState<Address>();

  const [cachedValues, setCachedValues] = useState<{ previewValue: number; positionValue: number }>({
    previewValue: 0,
    positionValue: 0,
  });

  const { success, output: maturity } = safeParse(
    pipe(string(), nonEmpty("no maturity")),
    useLocalSearchParams().maturity,
  );

  const handleAssetSelect = (market: Address) => {
    setSelectedMarket(market);
  };

  const { data: repaySimulation, isPending: isSimulatingRepay } = useSimulateContract({
    address: account,
    functionName: "repay",
    args: [success ? BigInt(maturity) : 0n],
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi],
    query: { enabled: !!account && !!USDCMarket },
  });
  const { data: crossRepaySimulation, isPending: isSimulatingCrossRepay } = useSimulateContract({
    address: account,
    functionName: "crossRepay",
    args: [success ? BigInt(maturity) : 0n, selectedMarket ?? zeroAddress],
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi, { type: "error", name: "InsufficientOutputAmount" }],
    query: {
      enabled: !!maturity && !!account && !!selectedMarket && selectedMarket !== parse(Address, marketUSDCAddress),
    },
  });

  const {
    data: repayHash,
    writeContract: repay,
    isPending: isRepaying,
    isSuccess: isRepaySuccess,
    error: repayError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
      },
    },
  });
  const {
    data: crossRepayHash,
    writeContract: crossRepay,
    isPending: isCrossRepaying,
    isSuccess: isCrossRepaySuccess,
    error: crossRepayError,
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
      },
    },
  });

  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const isUSDCSelected = selectedMarket === parse(Address, marketUSDCAddress);
  const borrow = USDCMarket?.fixedBorrowPositions.find((b) => b.maturity === BigInt(success ? maturity : 0));
  const previewValue = borrow
    ? (borrow.previewValue * (USDCMarket ? USDCMarket.usdPrice : 0n)) /
      10n ** BigInt(USDCMarket ? USDCMarket.decimals : 0)
    : 0n;
  const positionValue = borrow
    ? (borrow.position.principal * (USDCMarket ? USDCMarket.usdPrice : 0n)) /
      10n ** BigInt(USDCMarket ? USDCMarket.decimals : 0)
    : 0n;
  const discount = borrow ? Number(WAD - (previewValue * WAD) / positionValue) / 1e18 : 0;
  const feeValue = borrow
    ? (fixedRate(borrow.maturity, borrow.position.principal, borrow.position.fee, timestamp) *
        borrow.position.principal) /
      10n ** BigInt(USDCMarket ? USDCMarket.decimals : 0)
    : 0n;

  const handlePayment = useCallback(() => {
    setCachedValues({
      previewValue: Number(previewValue) / 1e18,
      positionValue: Number(positionValue) / 1e18,
    });

    if (isUSDCSelected) {
      if (!repaySimulation) throw new Error("no repay simulation");
      repay(repaySimulation.request);
    } else {
      if (!crossRepaySimulation) throw new Error("no cross repay simulation");
      crossRepay(crossRepaySimulation.request);
    }
  }, [previewValue, positionValue, isUSDCSelected, repaySimulation, repay, crossRepaySimulation, crossRepay]);

  const currentSimulation = isUSDCSelected ? repaySimulation : selectedMarket ? crossRepaySimulation : undefined;
  const isSimulating = isUSDCSelected ? isSimulatingRepay : selectedMarket ? isSimulatingCrossRepay : false;
  const isPending = isUSDCSelected ? isRepaying : selectedMarket ? isCrossRepaying : false;
  const isSuccess = isUSDCSelected ? isRepaySuccess : isCrossRepaySuccess;
  const error = isUSDCSelected ? repayError : crossRepayError;
  const hash = isUSDCSelected ? repayHash : selectedMarket ? crossRepayHash : undefined;

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0n);

  if (!selectedMarket && positions?.[0]) {
    const { market } = positions[0];
    setSelectedMarket(parse(Address, market));
  }

  const repayMarket = positions?.find((p) => p.market === selectedMarket);
  const repayMarketAvailable = markets && selectedMarket ? withdrawLimit(markets, selectedMarket) : 0n;

  if (!success || !repayMarket) return;
  if (!isPending && !isSuccess && !error)
    return (
      <SafeView fullScreen backgroundColor="$backgroundMild" paddingBottom={0}>
        <View fullScreen gap="$s5" paddingTop="$s4_5">
          <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
            <View padded position="absolute" left={0}>
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            </View>
            <Text color="$uiNeutralPrimary" emphasized subHeadline>
              <Text
                primary
                textAlign="center"
                emphasized
                subHeadline
                color={
                  isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                }
              >
                {titleCase(
                  isAfter(new Date(Number(maturity) * 1000), new Date())
                    ? `Due in ${formatDistance(new Date(), new Date(Number(maturity) * 1000))}`
                    : `${formatDistance(new Date(Number(maturity) * 1000), new Date())} past due`,
                )}
                <Text primary textAlign="center" emphasized subHeadline>
                  &nbsp;-&nbsp;{format(new Date(Number(maturity) * 1000), "MMM dd, yyyy")}
                </Text>
              </Text>
            </Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flex: 1, justifyContent: "space-between" }} // eslint-disable-line react-native/no-inline-styles
          >
            <View padded>
              <YStack gap="$s4" paddingTop="$s5">
                <XStack justifyContent="space-between" gap="$s3">
                  <Text secondary callout textAlign="left">
                    Purchases
                  </Text>
                  <Text primary title3 textAlign="right">
                    {(Number(positionValue) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                </XStack>
                {borrow && (
                  <XStack justifyContent="space-between" gap="$s3">
                    <Text secondary callout textAlign="left">
                      Fixed borrow APR&nbsp;
                      {(
                        Number(fixedRate(borrow.maturity, borrow.position.principal, borrow.position.fee, timestamp)) /
                        1e18
                      )
                        .toLocaleString(undefined, {
                          style: "percent",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                        .replaceAll(/\s+/g, "")}
                    </Text>
                    <Text
                      primary
                      title3
                      textAlign="right"
                      color={discount >= 0 ? "$interactiveOnBaseSuccessSoft" : "$interactiveOnBaseErrorSoft"}
                    >
                      {(Number(feeValue) / 1e18).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </XStack>
                )}
                <XStack justifyContent="space-between" gap="$s3">
                  <Text secondary callout textAlign="left">
                    {discount >= 0
                      ? `Early repay ${discount
                          .toLocaleString(undefined, {
                            style: "percent",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                          .replaceAll(/\s+/g, "")} OFF`
                      : `Late repay ${(-discount)
                          .toLocaleString(undefined, {
                            style: "percent",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                          .replaceAll(/\s+/g, "")} penalty`}
                  </Text>
                  <Text
                    primary
                    title3
                    textAlign="right"
                    color={discount >= 0 ? "$interactiveOnBaseSuccessSoft" : "$interactiveOnBaseErrorSoft"}
                  >
                    {Number(previewValue - positionValue) / 1e18 > 0.01
                      ? Math.abs(Number(previewValue - positionValue) / 1e18).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })
                      : `< ${(0.01).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </Text>
                </XStack>
                <Separator height={1} borderColor="$borderNeutralSoft" paddingVertical="$s2" />
                <XStack justifyContent="space-between" gap="$s3">
                  <Text emphasized secondary callout textAlign="left">
                    Total
                  </Text>
                  <Text emphasized primary title2 textAlign="right">
                    {(Number(previewValue) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                </XStack>
              </YStack>
            </View>
          </ScrollView>
          <View
            padded
            flexShrink={1}
            backgroundColor="$backgroundSoft"
            borderRadius="$r4"
            borderBottomLeftRadius={0}
            borderBottomRightRadius={0}
          >
            <YStack gap="$s4" paddingBottom={insets.bottom}>
              <XStack justifyContent="space-between" gap="$s3" alignItems="center">
                <Text secondary callout textAlign="left">
                  Pay with
                </Text>
                <XStack
                  gap="$s3"
                  alignItems="center"
                  onPress={() => {
                    setAssetSelectionOpen(true);
                  }}
                >
                  <AssetLogo
                    uri={assetLogos[repayMarket.assetSymbol as keyof typeof assetLogos]}
                    width={ms(16)}
                    height={ms(16)}
                  />
                  <Text primary emphasized headline textAlign="right">
                    {repayMarket.assetSymbol}
                  </Text>
                  <ChevronRight size={ms(24)} color="$interactiveBaseBrandDefault" />
                </XStack>
              </XStack>
              <XStack justifyContent="space-between" gap="$s3">
                <Text secondary callout textAlign="left">
                  Available
                </Text>
                <YStack gap="$s2">
                  <Text emphasized headline primary textAlign="right">
                    {(Number(repayMarket.usdValue) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                  <Text secondary footnote textAlign="right">
                    {`${(Number(repayMarketAvailable) / 10 ** repayMarket.decimals).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: Math.min(
                        8,
                        Math.max(
                          0,
                          repayMarket.decimals -
                            Math.ceil(Math.log10(Math.max(1, Number(repayMarket.usdValue) / 1e18))),
                        ),
                      ),
                      useGrouping: false,
                    })} ${repayMarket.assetSymbol}`}
                  </Text>
                </YStack>
              </XStack>
              <Button
                flexBasis={ms(60)}
                onPress={handlePayment}
                contained
                disabled={!currentSimulation || isSimulating}
                main
                spaced
                fullwidth
                iconAfter={
                  isSimulating ? (
                    <Spinner color="$interactiveOnDisabled" />
                  ) : (
                    <Coins
                      strokeWidth={2.5}
                      color={currentSimulation ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"}
                    />
                  )
                }
              >
                Confirm payment
              </Button>
            </YStack>
          </View>
          <AssetSelectionSheet
            positions={positions}
            isSimulating={isSimulating}
            disabled={!currentSimulation || isSimulating}
            symbol={repayMarket.assetSymbol}
            onAssetSelected={handleAssetSelect}
            open={assetSelectionOpen}
            onClose={() => {
              setAssetSelectionOpen(false);
            }}
          />
        </View>
      </SafeView>
    );
  if (isPending)
    return (
      <Pending
        maturity={maturity}
        usdAmount={cachedValues.previewValue}
        amount={cachedValues.positionValue}
        currency={repayMarket.assetSymbol}
      />
    );
  if (isSuccess)
    return (
      <Success
        maturity={maturity}
        usdAmount={cachedValues.previewValue}
        amount={cachedValues.positionValue}
        currency={repayMarket.assetSymbol}
        hash={hash}
      />
    );
  if (error)
    return (
      <Failure
        maturity={maturity}
        usdAmount={cachedValues.previewValue}
        amount={cachedValues.positionValue}
        currency={repayMarket.assetSymbol}
        hash={hash}
      />
    );
}
