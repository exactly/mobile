import { exaPluginAbi, marketUSDCAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { Coins, X } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { ScrollView, Spinner } from "tamagui";
import { parse } from "valibot";
import { zeroAddress } from "viem";
import { useSimulateContract, useWriteContract } from "wagmi";

import AssetSelector from "../../components/shared/AssetSelector";
import Button from "../../components/shared/Button";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";
import { auditorAbi, marketAbi } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";

export default function PaymentModal() {
  const { account, market: USDCMarket, markets, queryKey: marketAccount } = useMarketAccount(marketUSDCAddress);
  const [selectedMarket, setSelectedMarket] = useState<Address | undefined>();

  const usdDue = new Map<bigint, { position: bigint; previewValue: bigint }>();
  if (USDCMarket) {
    const { decimals, fixedBorrowPositions, usdPrice } = USDCMarket;
    for (const { maturity, position, previewValue } of fixedBorrowPositions) {
      if (!previewValue) continue;
      const preview = (previewValue * usdPrice) / 10n ** BigInt(decimals);
      const positionValue = ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
      usdDue.set(maturity, { position: positionValue, previewValue: preview });
    }
  }

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ assetSymbol, floatingDepositAssets }) => floatingDepositAssets > 0 && assetSymbol !== "WBTC"); // TODO remove this limitation when new swap pool is available

  const maturity = usdDue.keys().next().value;

  const {
    data: repaySimulation,
    error: repayError,
    isPending: isSimulatingRepay,
  } = useSimulateContract({
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi],
    address: account,
    args: [maturity ?? 0n],
    functionName: "repay",
    query: { enabled: !!account && !!USDCMarket },
  });
  const {
    data: crossRepaySimulation,
    error: crossRepayError,
    isPending: isSimulatingCrossRepay,
  } = useSimulateContract({
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi, { name: "InsufficientOutputAmount", type: "error" }],
    address: account,
    args: [maturity ?? 0n, selectedMarket ?? zeroAddress],
    functionName: "crossRepay",
    query: {
      enabled: !!maturity && !!account && !!selectedMarket && selectedMarket !== parse(Address, marketUSDCAddress),
    },
  });

  const { isPending: isRepaying, writeContract: repay } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
        router.replace("/payments");
      },
    },
  });
  const { isPending: isCrossRepaying, writeContract: crossRepay } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
        router.replace("/payments");
      },
    },
  });

  const handleAssetSelect = (market: Address) => {
    setSelectedMarket(market);
  };

  const isUSDCSelected = selectedMarket === parse(Address, marketUSDCAddress);
  const currentSimulation = isUSDCSelected ? repaySimulation : selectedMarket ? crossRepaySimulation : undefined;
  const currentError = isUSDCSelected ? repayError : selectedMarket ? crossRepayError : undefined;
  const isSimulating = isUSDCSelected ? isSimulatingRepay : selectedMarket ? isSimulatingCrossRepay : false;
  const isPaying = isUSDCSelected ? isRepaying : selectedMarket ? isCrossRepaying : false;

  const handlePayment = useCallback(() => {
    if (isUSDCSelected) {
      if (!repaySimulation) throw new Error("no repay simulation");
      repay(repaySimulation.request);
    } else {
      if (!crossRepaySimulation) throw new Error("no cross repay simulation");
      crossRepay(crossRepaySimulation.request);
    }
  }, [isUSDCSelected, repaySimulation, crossRepaySimulation, repay, crossRepay]);
  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen>
      <View fullScreen gap="$s5" padded>
        <View alignSelf="flex-end">
          <Pressable
            onPress={() => {
              router.back();
            }}
          >
            <X color="$uiNeutralSecondary" />
          </Pressable>
        </View>
        <ScrollView>
          <View gap="$s5">
            <View>
              <Text headline textAlign="center">
                Choose an asset to pay with
              </Text>
            </View>

            <View>
              <AssetSelector onSubmit={handleAssetSelect} positions={positions} />
            </View>
            <View>
              {currentError && (
                <Text color="$uiErrorSecondary" textAlign="center">
                  An error occurred. Try again later or contact support if the problem persists.
                </Text>
              )}
            </View>
            <View>
              <Button
                alignSelf="flex-end"
                contained
                disabled={!currentSimulation || !!currentError || isPaying || isSimulating}
                fullwidth
                iconAfter={
                  isPaying || isSimulating ? (
                    <Spinner color="$interactiveOnDisabled" />
                  ) : (
                    <Coins
                      color={
                        !currentSimulation || !!currentError
                          ? "$interactiveOnDisabled"
                          : "$interactiveOnBaseBrandDefault"
                      }
                    />
                  )
                }
                main
                onPress={handlePayment}
                spaced
              >
                Pay
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
