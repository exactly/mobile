import { usdcAddress } from "@exactly/common/generated/chain";
import { Coins } from "@tamagui/lucide-icons";
import { formatDistanceToNow, intlFormat } from "date-fns";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { Spinner } from "tamagui";
import { useWriteContract } from "wagmi";

import { useSimulateExaPluginRepay } from "../../generated/contracts";
import WAD from "../../utils/WAD";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import usePrivateText from "../../utils/usePrivateText";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const { hidden } = usePrivateText();
  const { account, market, queryKey } = useMarketAccount(usdcAddress);
  const usdDue = new Map<bigint, { previewValue: bigint; position: bigint }>();
  if (market) {
    const { fixedBorrowPositions, usdPrice, decimals } = market;
    for (const { maturity, previewValue, position } of fixedBorrowPositions) {
      if (!previewValue) continue;
      const preview = (previewValue * usdPrice) / 10n ** BigInt(decimals);
      const positionValue = ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
      usdDue.set(maturity, {
        previewValue: preview,
        position: positionValue,
      });
    }
  }
  const maturity = usdDue.keys().next().value;
  const duePayment = usdDue.get(maturity ?? 0n);

  const { data: repaySimulation } = useSimulateExaPluginRepay({
    address: account,
    args: [maturity ?? 0n],
    query: { enabled: !!market && !!account },
  });

  const { writeContract: repay, isPending: isRepaying } = useWriteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey }).catch(handleError);
      },
    },
  });

  const handleRepay = useCallback(() => {
    if (!repaySimulation) throw new Error("no repay simulation");
    repay(repaySimulation.request);
  }, [repay, repaySimulation]);

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
                  onPress={handleRepay}
                  contained
                  disabled={!repaySimulation || isRepaying}
                  main
                  spaced
                  halfWidth
                  iconAfter={
                    isRepaying ? (
                      <Spinner color="$interactiveOnDisabled" />
                    ) : (
                      <Coins color={repaySimulation ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
                    )
                  }
                >
                  Pay
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
