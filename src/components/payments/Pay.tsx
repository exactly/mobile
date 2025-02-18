import fixedRate from "@exactly/common/fixedRate";
import {
  exaPluginAbi,
  exaPluginAddress,
  marketUSDCAddress,
  upgradeableModularAccountAbi,
  usdcAddress,
} from "@exactly/common/generated/chain";
import latestExaPlugin from "@exactly/common/latestExaPlugin";
import { Address, Hex } from "@exactly/common/validation";
import { WAD, withdrawLimit } from "@exactly/lib";
import { ArrowLeft, ChevronRight, Coins } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, formatDistance, isAfter } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ms } from "react-native-size-matters";
import { ScrollView, Separator, Spinner, XStack, YStack } from "tamagui";
import { titleCase } from "title-case";
import { nonEmpty, parse, pipe, safeParse, string } from "valibot";
import { encodeFunctionData, erc20Abi, zeroAddress } from "viem";
import { useSimulateContract, useWriteContract } from "wagmi";

import AssetSelectionSheet from "./AssetSelectionSheet";
import Failure from "./Failure";
import Pending from "./Pending";
import Success from "./Success";
import Button from "../../components/shared/Button";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";
import { auditorAbi, marketAbi, useReadUpgradeableModularAccountGetInstalledPlugins } from "../../generated/contracts";
import { accountClient } from "../../utils/alchemyConnector";
import assetLogos from "../../utils/assetLogos";
import handleError from "../../utils/handleError";
import { getRoute } from "../../utils/lifi";
import queryClient from "../../utils/queryClient";
import useAsset from "../../utils/useAsset";
import AssetLogo from "../shared/AssetLogo";

export default function Pay() {
  const insets = useSafeAreaInsets();
  const [assetSelectionOpen, setAssetSelectionOpen] = useState(false);
  const { account, market: USDCMarket, markets, queryKey: marketAccount } = useAsset(marketUSDCAddress);

  const [selectedMarket, setSelectedMarket] = useState<{ address: Address; isExternalAsset: boolean }>({
    address: parse(Address, zeroAddress),
    isExternalAsset: true,
  });

  const [displayValues, setDisplayValues] = useState<{ amount: number; usdAmount: number }>({
    amount: 0,
    usdAmount: 0,
  });

  const { data: installedPlugins } = useReadUpgradeableModularAccountGetInstalledPlugins({
    address: account ?? zeroAddress,
  });
  const isLatestPlugin = installedPlugins?.[0] === latestExaPlugin;

  const { success, output: maturity } = safeParse(
    pipe(string(), nonEmpty("no maturity")),
    useLocalSearchParams().maturity,
  );

  const handleAssetSelect = (address: Address, isExternalAsset: boolean) => {
    setSelectedMarket({ address, isExternalAsset });
  };

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
  const isUSDCSelected = selectedMarket.address === parse(Address, marketUSDCAddress);
  const borrow = USDCMarket?.fixedBorrowPositions.find((b) => b.maturity === BigInt(success ? maturity : 0));

  const previewValue =
    borrow && USDCMarket ? (borrow.previewValue * USDCMarket.usdPrice) / 10n ** BigInt(USDCMarket.decimals) : 0n;
  const positionValue =
    borrow && USDCMarket
      ? ((borrow.position.principal + borrow.position.fee) * USDCMarket.usdPrice) / 10n ** BigInt(USDCMarket.decimals)
      : 0n;
  const discount = positionValue === 0n ? 0 : Number(WAD - (previewValue * WAD) / positionValue) / 1e18;

  const feeValue = borrow
    ? (fixedRate(borrow.maturity, borrow.position.principal, borrow.position.fee, timestamp) *
        borrow.position.principal) /
      10n ** BigInt(USDCMarket ? USDCMarket.decimals : 0)
    : 0n;

  const isPending = isUSDCSelected ? isRepaying : isCrossRepaying;
  const isSuccess = isUSDCSelected ? isRepaySuccess : isCrossRepaySuccess;
  const error = isUSDCSelected ? repayError : crossRepayError;
  const hash = isUSDCSelected ? repayHash : crossRepayHash;

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0n);

  if (selectedMarket.address === parse(Address, zeroAddress) && positions?.[0]) {
    const { market } = positions[0];
    setSelectedMarket({ address: parse(Address, market), isExternalAsset: false });
  }

  const repayMarket = positions?.find((p) => p.market === selectedMarket.address);
  const repayMarketAvailable =
    markets && !selectedMarket.isExternalAsset ? withdrawLimit(markets, selectedMarket.address) : 0n;

  const slippage = (WAD * 102n) / 100n;
  const maxRepay = borrow ? (borrow.previewValue * slippage) / WAD : 0n;

  const { data: route } = useQuery({
    initialData: { fromAmount: 0n, data: parse(Hex, "0x") },
    queryKey: ["lifi", "route", selectedMarket], // eslint-disable-line @tanstack/query/exhaustive-deps
    queryFn: async () => {
      if (!repayMarket || !borrow || !account) return { fromAmount: 0n, data: parse(Hex, "0x") };
      return await getRoute(repayMarket.asset, usdcAddress, maxRepay, account, exaPluginAddress);
    },
    refetchInterval: 5000,
  });

  const positionAssets = borrow ? borrow.position.principal + borrow.position.fee : 0n;
  const maxAmountIn = route.fromAmount;

  const {
    data: repaySimulation,
    isPending: isSimulatingRepay,
    error: repaySimulationError,
  } = useSimulateContract(
    isLatestPlugin
      ? {
          address: account,
          functionName: "repay",
          args: [success ? BigInt(maturity) : 0n, positionAssets, maxRepay],
          abi: [...auditorAbi, ...marketAbi, ...upgradeableModularAccountAbi, ...exaPluginAbi],
          query: {
            retry: 2,
            enabled:
              !!account &&
              !!USDCMarket &&
              !!success &&
              !!maturity &&
              selectedMarket.address === parse(Address, marketUSDCAddress),
          },
        }
      : {
          address: account,
          functionName: "repay",
          args: [success ? BigInt(maturity) : 0n],
          abi: [
            ...auditorAbi,
            ...marketAbi,
            ...upgradeableModularAccountAbi,
            {
              type: "function",
              inputs: [{ name: "maturity", internalType: "uint256", type: "uint256" }],
              name: "repay",
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          query: {
            retry: 2,
            enabled:
              !!account &&
              !!USDCMarket &&
              !!success &&
              !!maturity &&
              selectedMarket.address === parse(Address, marketUSDCAddress),
          },
        },
  );

  const {
    data: crossRepaySimulation,
    error: crossRepaySimulationError,
    isPending: isSimulatingCrossRepay,
  } = useSimulateContract(
    isLatestPlugin
      ? {
          address: account,
          functionName: "crossRepay",
          args: [
            success ? BigInt(maturity) : 0n,
            positionAssets,
            maxRepay,
            selectedMarket.address,
            maxAmountIn,
            route.data,
          ],
          abi: [...auditorAbi, ...marketAbi, ...upgradeableModularAccountAbi, ...exaPluginAbi],
          query: {
            retry: 2,
            enabled:
              !!success && !!maturity && !!account && selectedMarket.address !== parse(Address, marketUSDCAddress),
          },
        }
      : {
          address: account,
          functionName: "crossRepay",
          args: [success ? BigInt(maturity) : 0n, selectedMarket.address],
          abi: [
            ...auditorAbi,
            ...marketAbi,
            ...upgradeableModularAccountAbi,
            {
              type: "function",
              inputs: [
                { name: "maturity", internalType: "uint256", type: "uint256" },
                { name: "collateral", internalType: "contract IMarket", type: "address" },
              ],
              name: "crossRepay",
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          query: {
            retry: 2,
            enabled:
              !!success && !!maturity && !!account && selectedMarket.address !== parse(Address, marketUSDCAddress),
          },
        },
  );

  const simulationError = isUSDCSelected ? repaySimulationError : crossRepaySimulationError;

  const handlePayment = useCallback(() => {
    if (!repayMarket) return;
    setDisplayValues({
      amount: Number(isUSDCSelected ? positionAssets : route.fromAmount) / 10 ** repayMarket.decimals,
      usdAmount: Number(previewValue) / 1e18,
    });
    if (isUSDCSelected) {
      if (!repaySimulation) throw new Error("no repay simulation");
      repay(repaySimulation.request);
    } else {
      if (!crossRepaySimulation) throw new Error("no cross repay simulation");
      crossRepay(crossRepaySimulation.request);
    }
  }, [
    crossRepay,
    crossRepaySimulation,
    isUSDCSelected,
    positionAssets,
    previewValue,
    repay,
    repayMarket,
    repaySimulation,
    route.fromAmount,
  ]);

  const simulation = isUSDCSelected ? repaySimulation : crossRepaySimulation;
  const isSimulating = isUSDCSelected ? isSimulatingRepay : isSimulatingCrossRepay;

  if (selectedMarket.address === parse(Address, zeroAddress) && positions?.[0]) {
    const { market } = positions[0];
    setSelectedMarket({ address: parse(Address, market), isExternalAsset: false });
  }

  const {
    mutateAsync: repayWithExternalAsset,
    isPending: isRepayingWithExternalAsset,
    error: repayWithExternalAssetError,
  } = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("no account");
      if (!accountClient) throw new Error("no account client");
      if (!selectedMarket.isExternalAsset) throw new Error("not external asset");
      const lifiGatewayAddress = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"; // TODO get from codegen?
      const lifiRoute = await getRoute(selectedMarket.address, usdcAddress, maxRepay, account, account);
      const uoHash = await accountClient.sendUserOperation({
        uo: [
          // 1. approve external asset for the repay amount
          {
            value: 0n,
            target: selectedMarket.address,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [selectedMarket.address, lifiRoute.fromAmount],
            }),
          },
          // 2. call lifi gateway with returned route
          {
            value: 0n,
            target: lifiGatewayAddress,
            data: lifiRoute.data,
          },
          // 3. repay USDC market with the returned assets
          {
            value: 0n,
            target: marketUSDCAddress,
            data: encodeFunctionData({
              functionName: "repay",
              abi: marketAbi,
              args: [lifiRoute.toAmount, account],
            }),
          },
        ],
      });
      return await accountClient.waitForUserOperationTransaction(uoHash);
    },
  });

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
                    <Text primary title3 textAlign="right">
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
                <YStack>
                  <XStack
                    gap="$s3"
                    alignItems="center"
                    justifyContent="flex-end"
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
                  <Text secondary footnote textAlign="right">
                    {`${(
                      Number(isUSDCSelected ? positionAssets : route.fromAmount) /
                      10 ** repayMarket.decimals
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                      useGrouping: false,
                    })} ${repayMarket.assetSymbol}`}
                  </Text>
                </YStack>
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
                disabled={!simulation || isSimulating}
                main
                spaced
                fullwidth
                iconAfter={
                  isSimulating ? (
                    <Spinner color="$interactiveOnDisabled" />
                  ) : (
                    <Coins
                      strokeWidth={2.5}
                      color={simulation ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"}
                    />
                  )
                }
              >
                {isSimulating ? "Please wait..." : simulationError ? "Cannot proceed" : "Confirm payment"}
              </Button>
            </YStack>
          </View>
          <AssetSelectionSheet
            positions={positions}
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
        amount={displayValues.amount}
        usdAmount={displayValues.usdAmount}
        currency={repayMarket.assetSymbol}
      />
    );
  if (isSuccess)
    return (
      <Success
        maturity={maturity}
        amount={displayValues.amount}
        usdAmount={displayValues.usdAmount}
        currency={repayMarket.assetSymbol}
        hash={hash}
      />
    );
  if (error)
    return (
      <Failure
        maturity={maturity}
        amount={displayValues.amount}
        usdAmount={displayValues.usdAmount}
        currency={repayMarket.assetSymbol}
        hash={hash}
      />
    );
}
