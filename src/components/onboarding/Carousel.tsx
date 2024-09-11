import { ArrowRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { StyleProp, ViewStyle, ViewToken } from "react-native";
import { Platform, Pressable } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import type { SvgProps } from "react-native-svg";
import { useConnect } from "wagmi";

import ListItem from "./ListItem";
import Pagination from "./Pagination";
import calendarBlob from "../../assets/images/calendar-blob.svg";
import calendar from "../../assets/images/calendar.svg";
import earningsBlob from "../../assets/images/earnings-blob.svg";
import earnings from "../../assets/images/earnings.svg";
import exaCardBlob from "../../assets/images/exa-card-blob.svg";
import exaCard from "../../assets/images/exa-card.svg";
import qrCodeBlob from "../../assets/images/qr-code-blob.svg";
import qrCode from "../../assets/images/qr-code.svg";
import alchemyConnector from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getPasskey } from "../../utils/server";
import ActionButton from "../shared/ActionButton";
import Text from "../shared/Text";
import View from "../shared/View";

export interface Page {
  title: string;
  image: React.FC<SvgProps>;
  backgroundImage: React.FC<SvgProps>;
  disabled?: boolean;
}

const containerStyle: StyleProp<ViewStyle> = { justifyContent: "center", alignItems: "center" };

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
  const { title, disabled } = currentItem;

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
    ({ item, index }: { item: Page; index: number }) => {
      return <ListItem item={item} index={index} x={offsetX} />;
    },
    [offsetX],
  );

  const scrollToNextPage = useCallback(() => {
    flatListReference.current?.scrollToIndex({
      index: activeIndex < pages.length - 1 ? activeIndex + 1 : 0,
      animated: true,
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
      <View flexGrow={1} justifyContent="center" flexShrink={1}>
        <Animated.FlatList
          ref={flatListReference}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          data={pages}
          keyExtractor={(_, index) => index.toString()}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          renderItem={renderItem}
          onViewableItemsChanged={onViewableItemsChanged}
          horizontal
          onScrollToIndexFailed={() => undefined}
          pagingEnabled={Platform.OS !== "web"}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={containerStyle}
        />
      </View>

      <View
        padded
        flexGrow={1}
        flexDirection="column"
        alignSelf="stretch"
        alignItems="center"
        justifyContent="flex-end"
      >
        <View flexDirection="column" alignSelf="stretch" gap="$s5">
          <View flexDirection="row" justifyContent="center">
            <Pagination length={pages.length} x={offsetX} progress={progress} />
          </View>

          <View flexDirection="column" gap="$s5">
            <Text emphasized title brand centered>
              {title}
            </Text>
            <View height={ms(20)}>
              {disabled && (
                <Text
                  pill
                  emphasized
                  caption2
                  alignSelf="center"
                  backgroundColor="$interactiveBaseBrandDefault"
                  color="$interactiveOnBaseBrandDefault"
                >
                  COMING SOON
                </Text>
              )}
            </View>
          </View>

          <View alignItems="stretch" alignSelf="stretch" gap="$s5">
            <View flexDirection="row" alignSelf="stretch">
              <ActionButton
                onPress={() => {
                  router.push("../onboarding/(passkeys)/passkeys");
                }}
                iconAfter={<ArrowRight color="$interactiveOnBaseBrandDefault" fontWeight="bold" />}
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
                <Text fontSize={ms(13)} textAlign="center" fontWeight="bold" color="$interactiveBaseBrandDefault">
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
