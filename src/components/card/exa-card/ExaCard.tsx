import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import { YStack } from "tamagui";

import CardContents from "./CardContents";
import ModeSelector from "./ModeSelector";
import handleError from "../../../utils/handleError";
import queryClient from "../../../utils/queryClient";
import { getCard, setCardMode } from "../../../utils/server";
import View from "../../shared/View";

export default function ExaCard({ disabled }: { disabled: boolean }) {
  const { data: card, isFetching: isFetchingCardMode } = useQuery({ queryKey: ["card", "mode"], queryFn: getCard });

  const { mutateAsync: mutateCardMode, isPending: isMutatingCardMode } = useMutation({
    mutationKey: ["card", "mode"],
    mutationFn: setCardMode,
    onMutate: async (newMode) => {
      await queryClient.cancelQueries({ queryKey: ["card", "mode"] });
      const previousIsCredit = isCredit;
      const previousRIsCredit = rIsCredit.value;
      const previousRIsExpanded = rIsExpanded.value;
      setIsCredit(newMode === 1);
      rIsCredit.value = newMode === 1;
      if (!rIsCredit.value) {
        rIsExpanded.value = false;
      }
      return {
        previousIsCredit,
        previousRIsCredit,
        previousRIsExpanded,
      };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      setIsCredit(context.previousIsCredit);
      rIsCredit.value = context.previousRIsCredit;
      rIsExpanded.value = context.previousRIsExpanded;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "mode"] });
    },
  });

  const [isCredit, setIsCredit] = useState(true);
  const rIsCredit = useSharedValue(true);
  const rIsExpanded = useSharedValue(false);

  function toggleMode() {
    const newMode = rIsCredit.value ? 0 : 1;
    mutateCardMode(newMode).catch(handleError);
  }

  useEffect(() => {
    if (card) {
      setIsCredit(card.mode === 1);
      rIsCredit.value = card.mode === 1;
    }
  }, [card, rIsCredit]);

  const isLoading = isMutatingCardMode || isFetchingCardMode;

  return (
    <YStack width="100%" borderRadius="$r4" borderWidth={0} maxHeight={280}>
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
        onPress={() => {
          if (disabled || isLoading) return;
          toggleMode();
        }}
        marginTop={-20}
      >
        <ModeSelector isCredit={isCredit} disabled={disabled} />
      </View>
    </YStack>
  );
}
