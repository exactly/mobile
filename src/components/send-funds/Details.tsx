import chain from "@exactly/common/generated/chain";
import { User, Calendar, Hash, ExternalLink } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, Avatar } from "tamagui";

import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Details({ hash }: { hash?: string }) {
  const { data } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  return (
    <View padded gap="$s4">
      {data?.receiver && (
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$s3">
            <Avatar size={ms(20)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
              <User size={ms(16)} color="$interactiveOnBaseBrandDefault" />
            </Avatar>
            <Text footnote color="$uiNeutralSecondary">
              To
            </Text>
          </XStack>
          <Text fontFamily="$mono">{shortenAddress(data.receiver ?? "", 7, 7)}</Text>
        </XStack>
      )}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$s3">
          <Calendar size={ms(20)} color="$uiBrandPrimary" />
          <Text footnote color="$uiNeutralSecondary">
            Date
          </Text>
        </XStack>
        <Text>{format(new Date(), "yyyy-MM-dd")}</Text>
      </XStack>
      {hash && (
        <>
          <XStack
            hitSlop={ms(15)}
            justifyContent="space-between"
            alignItems="center"
            onPress={() => {
              setStringAsync(hash).catch(handleError);
              Alert.alert("Copied", "The transaction hash has been copied to the clipboard.");
            }}
          >
            <XStack alignItems="center" gap="$s3">
              <Hash size={ms(20)} color="$uiBrandPrimary" />
              <Text footnote color="$uiNeutralSecondary">
                Transaction hash
              </Text>
            </XStack>
            <Text fontFamily="$mono">{shortenAddress(hash, 7, 7)}</Text>
          </XStack>

          <Button
            onPress={() => {
              openBrowserAsync(`${chain.blockExplorers?.default.url}/tx/${hash}`).catch(handleError);
            }}
            contained
            main
            spaced
            fullwidth
            iconAfter={<ExternalLink color="$interactiveOnBaseBrandDefault" />}
          >
            View on explorer
          </Button>

          <View padded alignItems="center">
            <Pressable
              onPress={() => {
                queryClient.setQueryData(["withdrawal"], { receiver: undefined, market: undefined, amount: 0n });
                router.replace("/");
              }}
            >
              <Text emphasized footnote color="$interactiveBaseBrandDefault">
                Close
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
