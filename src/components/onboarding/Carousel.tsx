import type { StyleProp, ViewStyle, ViewToken } from "react-native";
import type { SvgProps } from "react-native-svg";

import { ArrowRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { useConnect } from "wagmi";

import calendar from "../../assets/images/calendar.svg";
import calendarBlob from "../../assets/images/calendar-blob.svg";
import earnings from "../../assets/images/earnings.svg";
import earningsBlob from "../../assets/images/earnings-blob.svg";
import exaCard from "../../assets/images/exa-card.svg";
import exaCardBlob from "../../assets/images/exa-card-blob.svg";
import qrCode from "../../assets/images/qr-code.svg";
import qrCodeBlob from "../../assets/images/qr-code-blob.svg";
import alchemyConnector from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getPasskey } from "../../utils/server";
import ActionButton from "../shared/ActionButton";
import Text from "../shared/Text";
import View from "../shared/View";
import ListItem from "./ListItem";
import Pagination from "./Pagination";

export interface Page {
  backgroundImage: React.FC<SvgProps>;
  disabled?: boolean;
  image: React.FC<SvgProps>;
  title: string;
}

const containerStyle: StyleProp<ViewStyle> = { alignItems: "center", justifyContent: "center" };

const pages: [Page, ...Page[]] = [
  {
    backgroundImage: exaCardBlob,
    image: exaCard,
    title: "The first onchain debit & credit card",
  },
  {
    backgroundImage: calendarBlob,
    image: calendar,
    title: "Buy now, pay later, and hold your crypto",
  },
  {
    backgroundImage: earningsBlob,
    image: earnings,
    title: "Maximize earnings, effortlessly",
  },
  {
    backgroundImage: qrCodeBlob,
    disabled: true,
    image: qrCode,
    title: "In-store QR payments, with crypto",
  },
];

export default function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { connect } = useConnect();

  const flatListReference = useRef<Animated.FlatList<Page>>(null);
  const offsetX = useSharedValue(0);
  const progress = useSharedValue(0);

  const currentItem = pages[activeIndex] ?? pages[0];
  const { disabled, title } = currentItem;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const newValue = viewableItems.length > 0 ? viewableItems[0]?.index : 0;
      setActiveIndex(newValue ?? 0);
      progress.value = 0;
    },
    [progress],
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      offsetX.value = event.contentOffset.x;
    },
  });

  const renderItem = useCallback(
    ({ index, item }: { index: number; item: Page }) => {
      return <ListItem index={index} item={item} x={offsetX} />;
    },
    [offsetX],
  );

  const scrollToNextPage = useCallback(() => {
    flatListReference.current?.scrollToIndex({
      animated: true,
      index: activeIndex < pages.length - 1 ? activeIndex + 1 : 0,
      viewPosition: 0.5,
    });
  }, [activeIndex]);

  const handleRecovery = useCallback(async () => {
    queryClient.setQueryData(["passkey"], await getPasskey());
    connect({ connector: alchemyConnector });
    router.push("/onboarding/success");
  }, [connect]);

  useEffect(() => {
    const timer = setInterval(() => {
      progress.value = withTiming(progress.value + 0.2, { duration: 1000, easing: Easing.linear }, () => {
        if (progress.value >= 1) {
          runOnJS(scrollToNextPage)();
          progress.value = 0;
        }
      });
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [activeIndex, progress, scrollToNextPage]);

  return (
    <View fullScreen>
      <View flexGrow={1} flexShrink={1} justifyContent="center">
        <Animated.FlatList
          bounces={false}
          contentContainerStyle={containerStyle}
          data={pages}
          horizontal
          keyExtractor={(_, index) => index.toString()}
          onScroll={handleScroll}
          onScrollToIndexFailed={() => undefined}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled={Platform.OS !== "web"}
          ref={flatListReference}
          renderItem={renderItem}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        />
      </View>

      <View
        alignItems="center"
        alignSelf="stretch"
        flexDirection="column"
        flexGrow={1}
        justifyContent="flex-end"
        padded
      >
        <View alignSelf="stretch" flexDirection="column" gap="$s5">
          <View flexDirection="row" justifyContent="center">
            <Pagination length={pages.length} progress={progress} x={offsetX} />
          </View>

          <View flexDirection="column" gap="$s5">
            <Text brand centered emphasized title>
              {title}
            </Text>
            <View height={ms(20)}>
              {disabled && (
                <Text
                  alignSelf="center"
                  backgroundColor="$interactiveBaseBrandDefault"
                  caption2
                  color="$interactiveOnBaseBrandDefault"
                  emphasized
                  pill
                >
                  COMING SOON
                </Text>
              )}
            </View>
          </View>

          <View alignItems="stretch" alignSelf="stretch" gap="$s5">
            <View alignSelf="stretch" flexDirection="row">
              <ActionButton
                iconAfter={<ArrowRight color="$interactiveOnBaseBrandDefault" fontWeight="bold" />}
                onPress={() => {
                  router.push("../onboarding/(passkeys)/passkeys");
                }}
              >
                Get started
              </ActionButton>
            </View>

            <View flexDirection="row" justifyContent="center">
              <Pressable
                hitSlop={ms(10)}
                onPress={() => {
                  handleRecovery().catch(handleError);
                }}
              >
                <Text color="$interactiveBaseBrandDefault" fontSize={ms(13)} fontWeight="bold" textAlign="center">
                  Recover an existing account
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
