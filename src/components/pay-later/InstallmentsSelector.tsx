import MAX_INSTALLMENTS from "@exactly/common/MAX_INSTALLMENTS";
import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { WAD } from "@exactly/lib";
import { ArrowRight } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";
import { parseUnits, zeroAddress } from "viem";

import { useReadPreviewerPreviewBorrowAtMaturity } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getCard, setCardMode } from "../../utils/server";
import useAsset from "../../utils/useAsset";
import useInstallments from "../../utils/useInstallments";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

function InstallmentsSelector() {
  const { firstMaturity } = useInstallments({ totalAmount: 100n, installments: 1 });
  const { data: card } = useQuery({
    queryKey: ["card", "details"],
    queryFn: getCard,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const { mutateAsync: mutateMode } = useMutation({
    mutationKey: ["card", "mode"],
    mutationFn: setCardMode,
    onMutate: async (newMode) => {
      await queryClient.cancelQueries({ queryKey: ["card", "details"] });
      const previous = queryClient.getQueryData(["card", "details"]);
      queryClient.setQueryData(["card", "details"], (old: Awaited<ReturnType<typeof getCard>>) => ({
        ...old,
        mode: newMode,
      }));
      return { previous };
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["card", "details"], context.previous);
      }
      handleError(error);
    },
    onSettled: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["card", "details"] });
      if (data && "mode" in data && data.mode > 0) {
        queryClient.setQueryData(["settings", "installments"], data.mode);
      }
    },
  });

  function setInstallments(installments: number) {
    if (!card) return;
    mutateMode(installments).catch(handleError);
  }
  return (
    <YStack gap="$s4_5" backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4">
      <YStack gap="$s3_5">
        <Text primary emphasized headline>
          Choose number of installments
        </Text>
        <Text caption textTransform="uppercase" color="$uiBrandSecondary">
          First due date → {format(new Date(Number(firstMaturity) * 1000), "MMM dd, yyyy")}
        </Text>
      </YStack>
      <YStack gap="$s3_5">
        <Text color="$uiNeutralSecondary" subHeadline>
          You can change the amount of installments for each individual purchase.
        </Text>
      </YStack>
      <XStack gap="$s3_5" flexWrap="wrap">
        {Array.from({ length: MAX_INSTALLMENTS }, (_, index) => index + 1).map((installment) => (
          <InstallmentButton
            key={installment}
            installment={installment}
            cardDetails={card}
            onSelect={setInstallments}
          />
        ))}
      </XStack>
      <Button
        main
        spaced
        onPress={() => {
          router.push("/(app)/simulate-purchase");
        }}
        iconAfter={<ArrowRight size={ms(20)} color="$interactiveOnBaseBrandSoft" />}
        backgroundColor="$interactiveBaseBrandSoftDefault"
        color="$interactiveOnBaseBrandSoft"
        {...outlined}
      >
        <Text fontSize={ms(15)} emphasized numberOfLines={1} adjustsFontSizeToFit color="$interactiveOnBaseBrandSoft">
          Estimate your payments
        </Text>
      </Button>
    </YStack>
  );
}

function InstallmentButton({
  installment,
  cardDetails,
  onSelect,
}: {
  installment: number;
  cardDetails?: { mode: number };
  onSelect: (installment: number) => void;
}) {
  const assets = parseUnits("100", 6);
  const { market, account } = useAsset(marketUSDCAddress);
  const {
    data: installments,
    firstMaturity,
    timestamp,
  } = useInstallments({
    totalAmount: assets,
    installments: installment,
  });
  const { data: borrowPreview } = useReadPreviewerPreviewBorrowAtMaturity({
    address: previewerAddress,
    args: [market?.market ?? zeroAddress, BigInt(firstMaturity), assets],
    query: { enabled: !!market && !!account && !!firstMaturity && assets > 0n },
  });
  const enabled = cardDetails?.mode && cardDetails.mode > 0;
  const selected = cardDetails?.mode === installment;
  return (
    <Pressable
      style={styles.button}
      onPress={() => {
        if (!enabled) return;
        onSelect(installment);
      }}
    >
      <View
        key={installment}
        height={ms(93)}
        maxHeight={ms(93)}
        borderWidth={1}
        backgroundColor={selected ? "$interactiveBaseBrandDefault" : "transparent"}
        borderColor={enabled ? "$borderBrandSoft" : "$interactiveDisabled"}
        borderRadius="$r4"
        alignItems="center"
        justifyContent="center"
        padding="$s4"
        width="auto"
        flexGrow={1}
      >
        <Text
          title
          color={
            selected
              ? "$interactiveOnBaseBrandDefault"
              : enabled
                ? "$interactiveOnBaseBrandSoft"
                : "$uiNeutralSecondary"
          }
        >
          {installment}
        </Text>
        <Text
          footnote
          color={
            selected
              ? "$interactiveOnBaseBrandDefault"
              : enabled
                ? "$interactiveOnBaseBrandSoft"
                : "$uiNeutralSecondary"
          }
        >
          {`${
            installment > 1
              ? installments
                ? (Number(installments.effectiveRate) / 1e18).toLocaleString(undefined, {
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
                : "N/A"
          } APR`}
        </Text>
      </View>
    </Pressable>
  );
}

const outlined = {
  hoverStyle: { backgroundColor: "$interactiveBaseBrandSoftHover" },
  pressStyle: {
    backgroundColor: "$interactiveBaseBrandSoftPressed",
    color: "$interactiveOnBaseBrandSoft",
  },
};

const styles = StyleSheet.create({ button: { flexGrow: 1 } });

export default InstallmentsSelector;
