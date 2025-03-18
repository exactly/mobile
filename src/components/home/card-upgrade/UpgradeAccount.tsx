import { ArrowUpToLine } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { YStack } from "tamagui";

import Progression from "./Progression";
import reportError from "../../../utils/reportError";
import queryClient from "../../../utils/queryClient";
import Button from "../../shared/Button";
import Spinner from "../../shared/Spinner";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function UpgradeAccount() {
  const toast = useToastController();
  const { data: step } = useQuery<number | undefined>({ queryKey: ["card-upgrade"] });
  const { mutateAsync: upgradeAccount, isPending: isUpgrading } = useMutation({
    // TODO upgrade account
    mutationFn: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 4000);
      });
    },
    onSuccess: () => {
      toast.show("Account upgraded!", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "success" },
      });
      queryClient.setQueryData(["card-upgrade"], 2);
    },
    onError: () => {
      toast.show("Error upgrading account", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "error" },
      });
    },
  });
  return (
    <View fullScreen flex={1} gap="$s6" paddingHorizontal="$s5" paddingTop="$s5" backgroundColor="$backgroundSoft">
      {isUpgrading ? (
        <>
          <YStack gap="$s6" justifyContent="center" alignItems="center">
            <Spinner color="$uiNeutralPrimary" backgroundColor="$backgroundMild" containerSize={ms(52)} size={ms(32)} />
            <YStack gap="$s2" justifyContent="center" alignItems="center">
              <Text emphasized title3 color="$uiNeutralSecondary">
                Updating your account
              </Text>
              <Text color="$uiNeutralSecondary" footnote>
                STEP {(step ?? 0) + 1} OF 3
              </Text>
            </YStack>
            <Text color="$uiNeutralSecondary" subHeadline alignSelf="center" textAlign="center">
              This may take a moment. Please wait.
            </Text>
          </YStack>
        </>
      ) : (
        <>
          <YStack gap="$s4">
            <ArrowUpToLine size={ms(32)} color="$uiBrandSecondary" />
            <Text emphasized title3 color="$uiBrandSecondary">
              Upgrade your account
            </Text>
          </YStack>
          <YStack>
            <Text color="$uiNeutralSecondary" subHeadline>
              Update your Exa account to support our new card provider. This quick step ensures a smooth transition to
              your upgraded Exa Card.
            </Text>
          </YStack>
          <Progression />
        </>
      )}
      <YStack paddingBottom="$s7">
        <Button
          disabled={isUpgrading}
          onPress={() => {
            upgradeAccount().catch(reportError);
          }}
          flexBasis={ms(60)}
          contained
          main
          spaced
          fullwidth
          backgroundColor={isUpgrading ? "$interactiveDisabled" : "$interactiveBaseBrandDefault"}
          color={isUpgrading ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandDefault"}
          iconAfter={
            <ArrowUpToLine
              strokeWidth={2.5}
              color={isUpgrading ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandDefault"}
            />
          }
        >
          Upgrade account now
        </Button>
      </YStack>
    </View>
  );
}
