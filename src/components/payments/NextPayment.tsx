import { Coins, FileText, IterationCw } from "@tamagui/lucide-icons";
import { formatDistanceToNow, intlFormat } from "date-fns";
import React, { useCallback } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { maxUint256, zeroAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import {
  debtManagerAddress,
  marketUSDCAddress,
  previewerAddress,
  useReadPreviewerExactly,
  useSimulateDebtManagerRollFixedToFloating,
  useSimulateMarketApprove,
} from "../../generated/contracts";
import WAD from "../../utils/WAD";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  const usdDue = new Map<bigint, { previewValue: bigint; position: bigint }>();
  if (markets) {
    for (const { fixedBorrowPositions, usdPrice, decimals } of markets) {
      for (const { maturity, previewValue, position } of fixedBorrowPositions) {
        if (!previewValue) continue;
        const payment = usdDue.get(maturity);
        const preview = (payment?.previewValue ?? 0n) + (previewValue * usdPrice) / 10n ** BigInt(decimals);
        if (payment) {
          payment.previewValue += preview;
          payment.position += ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
        } else {
          usdDue.set(maturity, {
            previewValue: preview,
            position: ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals),
          });
        }
      }
    }
  }
  const maturity = usdDue.keys().next().value as bigint | undefined;
  const duePayment = usdDue.get(maturity ?? 0n);

  const { data: approveSimulation } = useSimulateMarketApprove({
    address: marketUSDCAddress,
    args: [debtManagerAddress, maxUint256],
  });
  const { data: rolloverSimulation } = useSimulateDebtManagerRollFixedToFloating({
    address: debtManagerAddress,
    args: [marketUSDCAddress, maturity ?? 0n, maxUint256, WAD],
  });

  const { writeContract: approve } = useWriteContract();
  const { writeContract: rollover } = useWriteContract();

  const approveMarket = useCallback(() => {
    if (!approveSimulation) throw new Error("no approve simulation");
    approve(approveSimulation.request);
  }, [approve, approveSimulation]);
  const rollFixedToFloating = useCallback(() => {
    if (!rolloverSimulation) throw new Error("no rollover simulation");
    rollover(rolloverSimulation.request);
  }, [rollover, rolloverSimulation]);
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s5">
      {maturity ? (
        <>
          <View>
            <View flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text emphasized headline>
                Due in {formatDistanceToNow(Number(maturity) * 1000)}
              </Text>
              <Pressable>
                <View flexDirection="row" gap="$s2" alignItems="center">
                  <Text emphasized footnote color="$interactiveTextBrandDefault">
                    Statement
                  </Text>
                  <FileText size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            </View>
            <Text footnote color="$uiNeutralSecondary">
              {intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" }).toUpperCase()}
            </Text>
          </View>
          {duePayment && (
            <View gap="$s5">
              <View flexDirection="column" justifyContent="center" alignItems="center">
                <Text textAlign="center" fontFamily="$mono" fontSize={ms(40)} fontWeight="bold" overflow="hidden">
                  {(Number(duePayment.previewValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </Text>
              </View>
              <View flexDirection="row" gap="$s3" justifyContent="center">
                <Text subHeadline strikeThrough color="$uiNeutralSecondary">
                  {(Number(duePayment.position) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </Text>
                <Text
                  pill
                  caption2
                  padding="$s2"
                  backgroundColor="$interactiveBaseSuccessSoftDefault"
                  color="$uiSuccessSecondary"
                >
                  {(Number(WAD - (duePayment.previewValue * WAD) / duePayment.position) / 1e18).toLocaleString(
                    undefined,
                    {
                      style: "percent",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}{" "}
                  OFF
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
                <Button contained main spaced halfWidth iconAfter={<Coins color="$interactiveOnBaseBrandDefault" />}>
                  Pay
                </Button>
                <Button
                  outlined
                  main
                  spaced
                  halfWidth
                  iconAfter={
                    <IterationCw
                      color={rolloverSimulation ? "$interactiveOnBaseBrandSoft" : "$interactiveOnDisabled"}
                    />
                  }
                  onPress={rollFixedToFloating}
                  disabled={!rolloverSimulation}
                >
                  Rollover
                </Button>
              </View>
              <Button outlined main spaced onPress={approveMarket} disabled={!approveSimulation}>
                Approve
              </Button>
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
