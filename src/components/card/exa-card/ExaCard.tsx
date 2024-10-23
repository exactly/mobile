import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import Animated from "react-native-reanimated";
import { YStack } from "tamagui";

import CardContents from "./CardContents";
import InstallmentsSelector from "./InstallmentsSelector";
import ModeSelector from "./ModeSelector";
import handleError from "../../../utils/handleError";
import queryClient from "../../../utils/queryClient";
import { getCard, setCardMode } from "../../../utils/server";
import View from "../../shared/View";

export default function ExaCard({ disabled }: { disabled: boolean }) {
  const { data: card, isFetching: isFetchingCardMode } = useQuery({ queryKey: ["card", "mode"], queryFn: getCard });

  const { mutateAsync: mutateMode, isPending: isTogglingMode } = useMutation({
    mutationKey: ["card", "mode"],
    mutationFn: setCardMode,
    onMutate: async (newMode) => {
      await queryClient.cancelQueries({ queryKey: ["card", "mode"] });
      const previous = queryClient.getQueryData(["card", "mode"]);
      queryClient.setQueryData(["card", "mode"], (old: Awaited<ReturnType<typeof getCard>>) => ({
        ...old,
        mode: newMode,
      }));
      return { previous };
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["card", "mode"], context.previous);
      }
      handleError(error);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "mode"] });
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
    <AnimatedYStack width="100%" borderRadius="$r4" borderWidth={0} maxHeight={280}>
      <View zIndex={3} backgroundColor="black" borderColor="black" borderRadius="$r4" borderWidth={1} overflow="hidden">
        <CardContents isCredit={isCredit} isLoading={isLoading} disabled={disabled} />
      </View>
      <View
        zIndex={2}
        borderColor={disabled ? "$borderNeutralDisabled" : isCredit ? "$cardCreditBorder" : "$cardDebitBorder"}
        borderRadius="$r4"
        borderWidth={1}
        borderTopLeftRadius={0}
        borderTopRightRadius={0}
        marginTop={-20}
        onPress={() => {
          if (disabled || isLoading) return;
          toggle();
        }}
      >
        <ModeSelector isCredit={isCredit} disabled={disabled} />
      </View>
      <InstallmentsSelector
        isCredit={isCredit}
        disabled={disabled}
        value={card?.mode ?? 0}
        onChange={setInstallments}
      />
    </AnimatedYStack>
  );
}

const AnimatedYStack = Animated.createAnimatedComponent(YStack);
