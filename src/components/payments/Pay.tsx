import { exaPluginAbi, marketUSDCAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { CheckCircle2, Coins, X, XCircle } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
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
import Details from "../send-funds/Details";
import ExaSpinner from "../shared/Spinner";

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

  const {
    data: repayHash,
    writeContract: repay,
    isPending: isRepaying,
    isSuccess: isRepaySuccess,
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
  } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: marketAccount }).catch(handleError);
      },
    },
  });

  const handleAssetSelect = (market: Address) => {
    setSelectedMarket(market);
  };

  const isUSDCSelected = selectedMarket === parse(Address, marketUSDCAddress);
  const currentSimulation = isUSDCSelected ? repaySimulation : selectedMarket ? crossRepaySimulation : undefined;
  const isSimulating = isUSDCSelected ? isSimulatingRepay : selectedMarket ? isSimulatingCrossRepay : false;
  const isPending = isUSDCSelected ? isRepaying : selectedMarket ? isCrossRepaying : false;
  const isSuccess = isUSDCSelected ? isRepaySuccess : isCrossRepaySuccess;
  const isError = isUSDCSelected ? repayError : crossRepayError;
  const hash = isUSDCSelected ? repayHash : selectedMarket ? crossRepayHash : undefined;

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
          {isPending ? (
            <View>
              <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
                <View padded gap="$s5">
                  <View gap="$s4" alignItems="center">
                    <ExaSpinner />
                    <Text title3 color="$uiNeutralSecondary">
                      Processing payment...
                    </Text>
                  </View>
                </View>
              </View>
              <Details hash={hash} />
            </View>
          ) : isSuccess ? (
            <View>
              <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
                <View padded gap="$s5">
                  <View gap="$s4" alignItems="center">
                    <View
                      backgroundColor="$interactiveBaseSuccessSoftDefault"
                      width={ms(88)}
                      height={ms(88)}
                      justifyContent="center"
                      alignItems="center"
                      borderRadius="$r_0"
                      padding="$5"
                    >
                      <CheckCircle2 size={ms(56)} color="$interactiveOnBaseSuccessSoft" />
                    </View>
                    <Text title3 color="$uiSuccessSecondary">
                      Successfully paid
                    </Text>
                  </View>
                </View>
              </View>
              <Details hash={hash} />
            </View>
          ) : isError ? (
            <>
              <View borderBottomColor="$borderNeutralSoft" borderBottomWidth={1}>
                <View padded gap="$s5">
                  <View gap="$s4" alignItems="center">
                    <View
                      backgroundColor="$interactiveBaseErrorSoftDefault"
                      width={ms(88)}
                      height={ms(88)}
                      justifyContent="center"
                      alignItems="center"
                      borderRadius="$r_0"
                      padding="$5"
                    >
                      <XCircle size={ms(56)} color="$interactiveOnBaseErrorSoft" />
                    </View>
                    <Text title3 color="$uiErrorSecondary">
                      Payment failed
                    </Text>
                    <Text color="$uiErrorPrimary">{isError.message}</Text>
                  </View>
                </View>
              </View>
              <Details hash={hash} />
              <Button
                alignSelf="flex-end"
                onPress={() => {
                  router.back();
                }}
                contained
                main
                spaced
                fullwidth
                iconAfter={<X color="$interactiveOnBaseBrandDefault" />}
              >
                Close
              </Button>
            </>
          ) : (
            <View gap="$s5">
              <Text headline textAlign="center">
                Choose an asset to pay with
              </Text>
              <AssetSelector positions={positions} onSubmit={handleAssetSelect} />
              <View>
                <Button
                  alignSelf="flex-end"
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
                      <Coins color={currentSimulation ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
                    )
                  }
                >
                  Pay
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeView>
  );
}
