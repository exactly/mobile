import { ChevronRight, AlertTriangle } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, Spinner, XStack } from "tamagui";

export default function InfoAlert({
  title,
  actionText,
  loading,
  onPress,
}: {
  title: string;
  actionText: string;
  loading?: boolean;
  onPress?: () => void;
}) {
  return (
    <View
      borderRadius="$r6"
      flexDirection="row"
      backgroundColor="$interactiveBaseInformationSoftDefault"
      justifyContent="space-between"
      alignItems="center"
      gap={ms(10)}
      flex={1}
    >
      <View
        padding={ms(25)}
        backgroundColor="$interactiveBaseInformationDefault"
        justifyContent="center"
        alignItems="center"
        borderTopLeftRadius="$r6"
        borderBottomLeftRadius="$r6"
        width="20%"
        height="100%"
      >
        <AlertTriangle size={ms(32)} color="$interactiveOnBaseInformationDefault" />
      </View>
      <View gap={ms(10)} padding={ms(25)} flex={1}>
        <Text fontSize={ms(15)} color="$interactiveOnBaseInformationSoft">
          {title}
        </Text>
        <Pressable
          onPress={() => {
            onPress?.();
          }}
        >
          <XStack flexDirection="row" gap={ms(2)} alignItems="center">
            <Text color="$interactiveOnBaseInformationSoft" fontSize={ms(15)} fontWeight="bold">
              {actionText}
            </Text>
            {loading ? (
              <Spinner color="$interactiveOnBaseInformationSoft" />
            ) : (
              <ChevronRight
                size={ms(16)}
                color="$interactiveOnBaseInformationSoft"
                fontWeight="bold"
                strokeWidth={3}
                transform={[{ translateY: 1.2 }]}
              />
            )}
          </XStack>
        </Pressable>
      </View>
    </View>
  );
}
