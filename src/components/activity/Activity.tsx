import { Check, ChevronDown, ChevronUp, FileText, Info, Search } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { FlatList, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Adapt, Select, Separator, Sheet, XStack, YStack } from "tamagui";

import type { ActivityItem } from "./ListItem";
import SafeView from "../shared/SafeView";
import Input from "../shared/TamaguiInput";
import Text from "../shared/Text";
import View from "../shared/View";

const items: ActivityItem[] = [
  {
    id: "1",
    title: "Exactly",
    description: "Debt repay",
    logo: "https://example.com/logos/staking.png",
    date: Date.now().toString(),
    asset: {
      name: "ETH",
      amount: 1_200_000_000_000_000_000n,
      usdValue: 1_800_000_000_000_000_000_000n,
    },
  },
  {
    id: "2",
    title: "Exactly",
    description: "UNI deposit",
    date: Date.now().toString(),
    logo: "https://example.com/logos/uniswap.png",
    asset: {
      name: "UNI",
      amount: 50_000_000_000_000_000_000n,
      usdValue: 25_000_000_000_000_000_000n,
    },
  },
];

const periods = [
  { name: "Daily", value: "daily" },
  { name: "Weekly", value: "weekly" },
];

export default function Activity() {
  const [searchValue, setSearchValue] = useState("");
  const [period, setPeriod] = useState("daily");
  return (
    <SafeView fullScreen tab>
      <View fullScreen>
        <View padded gap="$s5" backgroundColor="$backgroundSoft">
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            <Text fontSize={ms(20)} fontWeight="bold">
              All Activity
            </Text>
            <Pressable>
              <FileText color="$uiNeutralPrimary" />
            </Pressable>
          </View>
          <View flexDirection="row" gap="$s3" alignItems="center">
            <XStack flexDirection="row" alignItems="center" gap="$s2">
              <Input minHeight={ms(40)} flex={1}>
                <Input.Input
                  value={searchValue}
                  onChangeText={setSearchValue}
                  placeholder="Search by keyword or Tx ID"
                />
                <Input.Icon>
                  <Search color="$iconBrandDefault" size={ms(20)} />
                </Input.Icon>
              </Input>

              <View>
                <Select value={period} onValueChange={setPeriod} disablePreventBodyScroll>
                  <Select.Trigger
                    backgroundColor="$interactiveBaseBrandSoftDefault"
                    borderColor="transparent"
                    color="$interactiveOnBaseBrandSoft"
                    iconAfter={ChevronDown}
                    padding="$s3"
                    size={ms(20)}
                  >
                    <Select.Value color="$interactiveOnBaseBrandSoft" />
                  </Select.Trigger>

                  <Adapt when="sm" platform="touch">
                    <Sheet modal dismissOnOverlayPress dismissOnSnapToBottom>
                      <Sheet.Frame backgroundColor="$uiNeutralTertiary" padding="$s5">
                        <Sheet.ScrollView>
                          <Adapt.Contents />
                        </Sheet.ScrollView>
                      </Sheet.Frame>
                    </Sheet>
                  </Adapt>

                  <Select.Content zIndex={200_000}>
                    <Select.ScrollUpButton
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      width="100%"
                      height="$3"
                    >
                      <YStack zIndex={10}>
                        <ChevronUp size={20} />
                      </YStack>
                    </Select.ScrollUpButton>
                    <Select.Viewport>
                      <Select.Group>
                        {/* eslint-disable-next-line react-native/no-raw-text */}
                        <Select.Label color="$uiNeutralSecondary">Period</Select.Label>
                        <Separator borderColor="$uiNeutralSecondary" opacity={0.1} />
                        {periods.map((item, index) => {
                          return (
                            <Select.Item index={index} key={item.name} value={item.value}>
                              <Select.ItemText color="$uiNeutralPrimary">{item.name}</Select.ItemText>
                              <Select.ItemIndicator marginLeft="auto">
                                <Check size={ms(20)} color="$uiNeutralPrimary" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          );
                        })}
                      </Select.Group>
                    </Select.Viewport>
                    <Select.ScrollDownButton
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      width="100%"
                      height="$3"
                    >
                      <YStack zIndex={10}>
                        <ChevronDown size={ms(20)} />
                      </YStack>
                    </Select.ScrollDownButton>
                  </Select.Content>
                </Select>
              </View>
            </XStack>
          </View>
        </View>
        <View padded gap="$s5">
          <FlatList
            data={items}
            ItemSeparatorComponent={() => <Separator margin="$s3" borderColor="transparent" />}
            renderItem={({ item: { id, title, description, asset } }) => {
              return (
                <View key={id} flexDirection="row" gap={ms(16)} alignItems="center">
                  <View
                    width={ms(40)}
                    height={ms(40)}
                    backgroundColor="$backgroundBrandMild"
                    borderRadius="$r3"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Info color="$iconBrandDefault" />
                  </View>
                  <View flex={1} gap="$s2">
                    <View flexDirection="row" justifyContent="space-between" alignItems="center">
                      <View gap="$s2">
                        <Text subHeadline color="$uiNeutralPrimary">
                          {title}
                        </Text>
                        <Text caption color="$uiNeutralSecondary">
                          {description}
                        </Text>
                      </View>
                      <View gap="$s2">
                        <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                          <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                            {(Number(asset.usdValue) / 1e18).toLocaleString(undefined, {
                              style: "currency",
                              currency: "USD",
                            })}
                          </Text>
                        </View>
                        <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                          {(Number(asset.amount) / 1e18).toLocaleString()} {asset.name}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </SafeView>
  );
}
