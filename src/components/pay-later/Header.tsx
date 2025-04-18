import MAX_INSTALLMENTS from "@exactly/common/MAX_INSTALLMENTS";
import { ArrowRight } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { Pressable } from "react-native";
import { Separator, Switch, XStack, YStack } from "tamagui";

import queryClient from "../../utils/queryClient";
import reportError from "../../utils/reportError";
import { getCard, setCardMode } from "../../utils/server";
import useIntercom from "../../utils/useIntercom";
import Text from "../shared/Text";

export default function Header() {
  const { data: lastInstallments } = useQuery<number>({ queryKey: ["settings", "installments"] });
  const { presentArticle } = useIntercom();
  const { data: cardDetails } = useQuery({
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
      reportError(error);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "details"] });
    },
  });

  function togglePayLater() {
    if (!cardDetails) return;
    mutateMode(cardDetails.mode === 0 ? (lastInstallments ?? 1) : 0).catch(reportError);
  }
  return (
    <YStack backgroundColor="$backgroundSoft" paddingTop="$s8" paddingBottom="$s3" gap="$s4_5">
      <XStack gap={10} justifyContent="space-between" alignItems="center">
        <Text fontSize={20} fontWeight="bold">
          Pay Later
        </Text>
        <XStack alignItems="center" gap={16}>
          <Switch
            height={24}
            checked={!!(cardDetails?.mode && cardDetails.mode > 0)}
            backgroundColor="$backgroundMild"
            borderColor="$borderNeutralSoft"
          >
            <Switch.Thumb
              onPress={togglePayLater}
              checked={!!(cardDetails?.mode && cardDetails.mode > 0)}
              shadowColor="$uiNeutralSecondary"
              animation="moderate"
              backgroundColor={
                cardDetails?.mode && cardDetails.mode > 0 ? "$interactiveBaseBrandDefault" : "$interactiveDisabled"
              }
            />
          </Switch>
        </XStack>
      </XStack>
      <Text subHeadline secondary>
        Turn on Pay Later to defer your future purchases and split the cost into multiple installments. Once enabled,
        all new purchases will use Pay Later unless you turn it off. Exactly Protocol offers up to
        {` ${MAX_INSTALLMENTS} `}
        fixed-rate payments in USDC*.
      </Text>
      <Separator height={1} borderColor="$borderNeutralSoft" paddingVertical="$s2" />
      <Pressable
        onPress={() => {
          presentArticle("9465994").catch(reportError);
        }}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text color="$uiBrandSecondary" footnote>
            Learn more about Pay Later and how it works
          </Text>
          <ArrowRight size={16} strokeWidth={2.5} color="$uiBrandSecondary" />
        </XStack>
      </Pressable>
    </YStack>
  );
}
