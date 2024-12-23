import { exaPluginAbi, marketUSDCAddress, upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import { MATURITY_INTERVAL, WAD } from "@exactly/lib";
import { Coins, Info, RefreshCcw } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistance, isAfter } from "date-fns";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Spinner, XStack } from "tamagui";
import { useSimulateContract, useWriteContract } from "wagmi";

import { auditorAbi, marketAbi } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useIntercom from "../../utils/useIntercom";
import useMarketAccount from "../../utils/useMarketAccount";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const toast = useToastController();
  const { presentArticle } = useIntercom();
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  const { market: USDCMarket, account, queryKey } = useMarketAccount(marketUSDCAddress);
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
  const maturity = usdDue.keys().next().value;
  const duePayment = usdDue.get(maturity ?? 0n);
  const discount = duePayment ? Number(WAD - (duePayment.previewValue * WAD) / duePayment.position) / 1e18 : 0;
  const followingMaturity = Number(maturity) + MATURITY_INTERVAL;

  const repayMaturity = maturity ?? 0n;
  const borrowMaturity = BigInt(followingMaturity);
  const maxRepayAssets = duePayment ? duePayment.position : 0n;
  const maxBorrowAssets = duePayment ? duePayment.position : 0n;
  const percentage = WAD;

  const {
    data: rolloverSimulation,
    isPending: isSimulatingRollover,
    error: rolloverSimulationError,
  } = useSimulateContract({
    abi: [...exaPluginAbi, ...upgradeableModularAccountAbi, ...auditorAbi, ...marketAbi],
    args: [repayMaturity, borrowMaturity, maxRepayAssets, maxBorrowAssets, percentage],
    query: { retry: false, enabled: maxRepayAssets !== 0n && maxBorrowAssets !== 0n }, // TODO remove
    functionName: "rollDebt",
    address: account,
    account,
  });

  const { writeContract: rollover, isPending: isRollingDebt } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey }).catch(handleError);
        toast.show("Success", { customData: { type: "success" } });
      },
      onError: (error) => {
        if (error.name === "ContractFunctionExecutionError" && error.details === "AA23 reverted (or OOG)") {
          toast.show("Cancelled", { customData: { type: "error" } });
          return;
        }
        toast.show("An error ocurred", { customData: { type: "error" } });
      },
    },
  });

  const rollDebt = useCallback(() => {
    if (!rolloverSimulation || rolloverSimulationError || isRollingDebt) throw new Error("no rollover simulation");
    rollover(rolloverSimulation.request);
  }, [isRollingDebt, rollover, rolloverSimulation, rolloverSimulationError]);

  return (
    <View backgroundColor="$backgroundSoft" paddingTop="$s8">
      {maturity ? (
        <>
          {duePayment && (
            <View gap="$s5">
              <XStack alignItems="center" justifyContent="center" gap="$s3">
                <Text
                  secondary
                  textAlign="center"
                  emphasized
                  subHeadline
                  color={
                    isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralSecondary" : "$uiErrorSecondary"
                  }
                >
                  {isAfter(new Date(Number(maturity) * 1000), new Date())
                    ? `Due in ${formatDistance(new Date(), new Date(Number(maturity) * 1000))}`
                    : `${formatDistance(new Date(Number(maturity) * 1000), new Date())} past due`}
                  <Text secondary textAlign="center" emphasized subHeadline color="$uiNeutralSecondary">
                    &nbsp;-&nbsp;{format(new Date(Number(maturity) * 1000), "MMM dd, yyyy")}
                  </Text>
                </Text>
                <Pressable
                  onPress={() => {
                    presentArticle("10245778").catch(handleError);
                  }}
                  hitSlop={ms(15)}
                >
                  <Info size={16} color="$uiNeutralPrimary" />
                </Pressable>
              </XStack>
              <View flexDirection="column" justifyContent="center" alignItems="center" gap="$s4">
                <Text
                  sensitive
                  textAlign="center"
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                  color={
                    isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                  }
                >
                  {(Number(duePayment.previewValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>
                {discount >= 0 && (
                  <Text sensitive body strikeThrough color="$uiNeutralSecondary">
                    {(Number(duePayment.position) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                )}
                {!hidden && (
                  <Text
                    pill
                    caption2
                    padding="$s2"
                    backgroundColor={
                      discount >= 0 ? "$interactiveBaseSuccessSoftDefault" : "$interactiveBaseErrorSoftDefault"
                    }
                    color={discount >= 0 ? "$uiSuccessSecondary" : "$uiErrorSecondary"}
                  >
                    {discount >= 0 ? "PAY NOW AND SAVE " : "DAILY PENALTIES "}
                    {(discount >= 0 ? discount : discount * -1).toLocaleString(undefined, {
                      style: "percent",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                )}
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
                    router.push({ pathname: "/pay", params: { maturity: maturity.toString() } });
                  }}
                  contained
                  main
                  spaced
                  halfWidth
                  iconAfter={<Coins color="$interactiveOnBaseBrandDefault" strokeWidth={2.5} />}
                >
                  Pay
                </Button>
                <Button
                  main
                  spaced
                  halfWidth
                  {...outlined}
                  onPress={rollDebt}
                  iconAfter={
                    isRollingDebt || isSimulatingRollover ? (
                      <Spinner color="$interactiveOnDisabled" />
                    ) : (
                      <RefreshCcw color="$interactiveOnBaseBrandSoft" strokeWidth={2.5} />
                    )
                  }
                  backgroundColor="$interactiveBaseBrandSoftDefault"
                  disabled={isRollingDebt || isSimulatingRollover}
                  color={
                    isRollingDebt || isSimulatingRollover ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandSoft"
                  }
                >
                  <Text
                    fontSize={ms(15)}
                    emphasized
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    color={
                      isRollingDebt || isSimulatingRollover ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandSoft"
                    }
                  >
                    Rollover
                  </Text>
                </Button>
              </View>
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

const outlined = {
  hoverStyle: { backgroundColor: "$interactiveBaseBrandSoftHover" },
  pressStyle: {
    backgroundColor: "$interactiveBaseBrandSoftPressed",
    color: "$interactiveOnBaseBrandSoft",
  },
};
