import { marketUSDCAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/types";
import { Coins } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, intlFormat } from "date-fns";
import React, { useCallback, useState } from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, Spinner } from "tamagui";
import { parse } from "valibot";
import { zeroAddress } from "viem";
import { useWriteContract } from "wagmi";

import PaymentModal from "./PaymentModal";
import { useSimulateExaPluginCrossRepay, useSimulateExaPluginRepay } from "../../generated/contracts";
import WAD from "../../utils/WAD";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import AssetSelector from "../shared/AssetSelector";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  const { account, market: USDCMarket, markets, queryKey } = useMarketAccount(marketUSDCAddress);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
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
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0);

  const maturity = usdDue.keys().next().value;
  const duePayment = usdDue.get(maturity ?? 0n);

  const {
    data: repaySimulation,
    error: repayError,
    isPending: isSimulatingRepay,
  } = useSimulateExaPluginRepay({
    address: account,
    args: [maturity ?? 0n],
    query: { enabled: !!USDCMarket && !!account },
  });
  const {
    data: crossRepaySimulation,
    error: crossRepayError,
    isPending: isSimulatingCrossRepay,
  } = useSimulateExaPluginCrossRepay({
    address: account,
    args: [maturity ?? 0n, selectedMarket ?? zeroAddress],
    query: {
      enabled: !!maturity && !!account && !!selectedMarket && selectedMarket !== parse(Address, marketUSDCAddress),
    },
  });

  const { writeContract: repay, isPending: isRepaying } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey }).catch(handleError);
        setIsPaymentModalVisible(false);
      },
    },
  });
  const { writeContract: crossRepay, isPending: isCrossRepaying } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey }).catch(handleError);
        setIsPaymentModalVisible(false);
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

  const handlePaymentModalClose = () => {
    setIsPaymentModalVisible(false);
    setSelectedMarket(undefined);
  };
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s5">
      {maturity ? (
        <>
          <View>
            <View flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text emphasized headline>
                Due in {formatDistanceToNow(Number(maturity) * 1000)}
              </Text>
            </View>
            <Text footnote color="$uiNeutralSecondary">
              {intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" }).toUpperCase()}
            </Text>
          </View>
          {duePayment && (
            <View gap="$s5">
              <View flexDirection="column" justifyContent="center" alignItems="center" gap="$s4">
                {!hidden && (
                  <Text
                    pill
                    caption2
                    padding="$s2"
                    backgroundColor="$interactiveBaseSuccessSoftDefault"
                    color="$uiSuccessSecondary"
                  >
                    PAY NOW AND SAVE{" "}
                    {(Number(WAD - (duePayment.previewValue * WAD) / duePayment.position) / 1e18).toLocaleString(
                      undefined,
                      {
                        style: "percent",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}{" "}
                  </Text>
                )}
                <Text sensitive body strikeThrough color="$uiNeutralSecondary">
                  {(Number(duePayment.position) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </Text>
                <Text
                  sensitive
                  textAlign="center"
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                >
                  {(Number(duePayment.previewValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </Text>
              </View>
              <View
                flexDirection="row"
                display="flex"
                gap={ms(10)}
                justifyContent="center"
                alignItems="center"
                paddingVertical={ms(10)}
              >
                <Button
                  onPress={() => {
                    setIsPaymentModalVisible(true);
                  }}
                  contained
                  main
                  spaced
                  halfWidth
                  iconAfter={<Coins color="$interactiveOnBaseBrandDefault" />}
                >
                  Pay
                </Button>
              </View>
              <PaymentModal isVisible={isPaymentModalVisible} onClose={handlePaymentModalClose}>
                <ScrollView>
                  <View gap="$s5" padded paddingTop={0}>
                    <Text headline textAlign="center">
                      Choose an asset to pay with
                    </Text>
                    <AssetSelector positions={positions} onSubmit={handleAssetSelect} />
                    {currentError && (
                      <Text color="$uiErrorSecondary" textAlign="center">
                        An error occurred. Try again later or contact support if the problem persists.
                      </Text>
                    )}
                    <Button
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
                </ScrollView>
              </PaymentModal>
            </View>
          )}
        </>
      ) : (
        <View>
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            There are no fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}
