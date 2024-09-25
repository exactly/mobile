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

  const usdDue = new Map<bigint, { previewValue: bigint; position: bigint }>();
  if (USDCMarket) {
    const { fixedBorrowPositions, usdPrice, decimals } = USDCMarket;
    for (const { maturity, previewValue, position } of fixedBorrowPositions) {
      if (!previewValue) continue;
      const preview = (previewValue * usdPrice) / 10n ** BigInt(decimals);
      const positionValue = ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
      usdDue.set(maturity, { previewValue: preview, position: positionValue });
    }
  }

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets, assetSymbol }) => floatingDepositAssets > 0 && assetSymbol !== "WBTC"); // TODO remove this limitation when new swap pool is available

  const maturity = usdDue.keys().next().value;

  const {
    data: repaySimulation,
    error: repayError,
    isPending: isSimulatingRepay,
  } = useSimulateContract({
    address: account,
    functionName: "repay",
    args: [maturity ?? 0n],
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi],
    query: { enabled: !!account && !!USDCMarket },
  });
  const {
    data: crossRepaySimulation,
    error: crossRepayError,
    isPending: isSimulatingCrossRepay,
  } = useSimulateContract({
    address: account,
    functionName: "crossRepay",
    args: [maturity ?? 0n, selectedMarket ?? zeroAddress],
    abi: [...exaPluginAbi, ...auditorAbi, ...marketAbi, { type: "error", name: "InsufficientOutputAmount" }],
    query: {
      enabled: !!maturity && !!account && !!selectedMarket && selectedMarket !== parse(Address, marketUSDCAddress),
    },
  });

  const { writeContract: repay, isPending: isRepaying } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
        router.replace("/payments");
      },
    },
  });
  const { writeContract: crossRepay, isPending: isCrossRepaying } = useWriteContract({
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
    <SafeView fullScreen backgroundColor="$backgroundSoft">
      <View fullScreen padded gap="$s5">
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
              <AssetSelector positions={positions} onSubmit={handleAssetSelect} />
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
                onPress={handlePayment}
                contained
                disabled={!currentSimulation || !!currentError || isPaying || isSimulating}
                main
                spaced
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
