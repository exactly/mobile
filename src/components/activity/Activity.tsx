import { ArrowUpFromLine, FileText } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React from "react";
import { FlatList, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Separator, Spinner } from "tamagui";

import { getActivity } from "../../utils/server";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Activity() {
  const { data: activity, isLoading } = useQuery({ queryKey: ["activity"], queryFn: getActivity });
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
        </View>
        <View gap="$s5" flex={1}>
          {isLoading ? (
            <View margin="$s5" justifyContent="center" alignItems="center">
              <Spinner color="$interactiveBaseBrandDefault" />
            </View>
          ) : (
            <FlatList
              ListEmptyComponent={
                <View
                  margin="$s5"
                  borderRadius="$r3"
                  backgroundColor="$uiNeutralTertiary"
                  padding="$s3_5"
                  alignSelf="center"
                >
                  <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
                    There is no activity yet.
                  </Text>
                </View>
              }
              data={activity}
              ItemSeparatorComponent={() => <Separator margin="$s3" borderColor="transparent" />}
              renderItem={({ item, index }) => {
                const { amount, currency, id, merchant, timestamp, usdAmount } = item;
                return (
                  <View
                    key={id}
                    flexDirection="row"
                    gap={ms(16)}
                    alignItems="center"
                    paddingHorizontal="$s5"
                    paddingTop={index === 0 ? "$s4" : 0}
                    paddingBottom={index + 1 === activity?.length ? "$s4" : 0}
                  >
                    <View
                      width={ms(40)}
                      height={ms(40)}
                      backgroundColor="$backgroundBrandMild"
                      borderRadius="$r3"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <ArrowUpFromLine color="$iconBrandDefault" />
                    </View>
                    <View flex={1} gap="$s2">
                      <View flexDirection="row" justifyContent="space-between" alignItems="flex-start">
                        <View gap="$s2">
                          <Text subHeadline color="$uiNeutralPrimary">
                            {merchant.name}
                          </Text>
                          <Text caption color="$uiNeutralSecondary">
                            {[merchant.city, merchant.state, merchant.country].filter(Boolean).join(", ")}
                          </Text>
                          <Text caption color="$uiNeutralSecondary">
                            {format(timestamp, "dd/MM/yyyy", { locale: undefined })}
                          </Text>
                        </View>
                        <View gap="$s2">
                          <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                            <Text sensitive fontSize={ms(15)} fontWeight="bold" textAlign="right">
                              {Number(usdAmount).toLocaleString(undefined, {
                                style: "currency",
                                currency: "USD",
                              })}
                            </Text>
                          </View>
                          <Text sensitive fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                            {Number(amount).toLocaleString()} {currency ?? "USD"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </SafeView>
  );
}
