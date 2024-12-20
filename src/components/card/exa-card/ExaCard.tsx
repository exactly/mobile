import { exaPluginAddress } from "@exactly/common/generated/chain";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import Animated from "react-native-reanimated";
import { YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import CardContents from "./CardContents";
import InstallmentsSelector from "./InstallmentsSelector";
import ModeSelector from "./ModeSelector";
import { useReadUpgradeableModularAccountGetInstalledPlugins } from "../../../generated/contracts";
import handleError from "../../../utils/handleError";
import queryClient from "../../../utils/queryClient";
import { getCard, setCardMode } from "../../../utils/server";
import View from "../../shared/View";

interface ExaCardProperties {
  disabled?: boolean;
  revealing: boolean;
  frozen: boolean;
  onPress?: () => void;
}

export default function ExaCard({ disabled = false, revealing, frozen, onPress }: ExaCardProperties) {
  const { address } = useAccount();
  const { data: card, isFetching: isFetchingCardMode } = useQuery({ queryKey: ["card", "details"], queryFn: getCard });
  const { data: installedPlugins } = useReadUpgradeableModularAccountGetInstalledPlugins({
    address: address ?? zeroAddress,
  });
  const { mutateAsync: mutateMode, isPending: isTogglingMode } = useMutation({
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
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "details"] });
    },
  });

  function toggle() {
    if (!card) return;
    mutateMode(isCredit ? 0 : 1).catch(handleError);
  }

  function setInstallments(installments: number) {
    if (!card) return;
    mutateMode(installments).catch(handleError);
  }

  const isLoading = isTogglingMode || isFetchingCardMode;
  const isCredit = card ? card.mode > 0 : false;

  return (
    <AnimatedYStack
      width="100%"
      borderRadius="$r4"
      borderWidth={0}
      onPress={() => {
        if (disabled || isLoading) return;
        onPress?.();
      }}
    >
      <View zIndex={3} backgroundColor="black" borderColor="black" borderRadius="$r4" borderWidth={1} overflow="hidden">
        <CardContents
          isCredit={isCredit}
          disabled={disabled}
          lastFour={card?.lastFour}
          frozen={frozen}
          revealing={revealing}
        />
      </View>
      <View
        zIndex={2}
        borderColor={
          disabled || frozen ? "$borderNeutralDisabled" : isCredit ? "$cardCreditBorder" : "$cardDebitBorder"
        }
        borderRadius="$r4"
        borderWidth={1}
        borderTopLeftRadius={0}
        borderTopRightRadius={0}
        marginTop={-20}
        onPress={() => {
          if (disabled || frozen || isLoading) return;
          toggle();
        }}
      >
        <ModeSelector isCredit={isCredit} disabled={disabled} frozen={frozen} />
      </View>
      {exaPluginAddress === installedPlugins?.[0] && (
        <InstallmentsSelector
          isCredit={isCredit}
          disabled={disabled || frozen}
          value={card?.mode ?? 0}
          onChange={setInstallments}
        />
      )}
    </AnimatedYStack>
  );
}

const AnimatedYStack = Animated.createAnimatedComponent(YStack);
