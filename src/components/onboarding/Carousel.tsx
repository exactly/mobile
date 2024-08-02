import { ArrowRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, type ViewToken } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import type { SvgProps } from "react-native-svg";
import { View, Text } from "tamagui";

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
import ActionButton from "../shared/ActionButton";

const recoverButton = (
  <Pressable onPress={() => {}}>
    <Text fontSize={ms(13)} fontWeight={600} color="$interactiveBaseBrandDefault">
      Recover an existing account
    </Text>
  </Pressable>
);

export interface Page {
  title: string;
  image: React.FC<SvgProps>;
  backgroundImage: React.FC<SvgProps>;
  disabled?: boolean;
  button?: React.ReactNode;
}

const pages: Page[] = [
  {
    backgroundImage: exaCardBlob,
    button: recoverButton,
    image: exaCard,
    title: "The first onchain debit & credit card",
  },
  {
    backgroundImage: calendarBlob,
    button: recoverButton,
    image: calendar,
    title: "Buy now, pay later, and hold your crypto",
  },
  {
    backgroundImage: earningsBlob,
    button: recoverButton,
    image: earnings,
    title: "Maximize earnings, effortlessly.",
  },
  {
    backgroundImage: qrCodeBlob,
    button: recoverButton,
    disabled: true,
    image: qrCode,
    title: "In-store QR payments, with crypto",
  },
];

export default function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListReference = useRef<Animated.FlatList<Page>>(null);
  const x = useSharedValue(0);
  const progress = useSharedValue(0);
  const currentItem = pages[activeIndex] || (pages[0] as Page);
  const { title, button, disabled } = currentItem;

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
      x.value = event.contentOffset.x;
    },
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Page; index: number }) => {
      return <ListItem item={item} index={index} x={x} />;
    },
    [x],
  );

  const scrollToNextPage = useCallback(() => {
    flatListReference.current?.scrollToIndex({
      index: activeIndex < pages.length - 1 ? activeIndex + 1 : 0,
      animated: true,
      viewPosition: 0.5,
    });
  }, [activeIndex]);

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
    <View flex={1} paddingVertical={ms(10)}>
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
        onScrollToIndexFailed={() => {}}
        pagingEnabled={Platform.OS !== "web"}
        bounces={false}
        showsHorizontalScrollIndicator={false}
      />
      <View flexDirection="column" paddingHorizontal={ms(20)} gap={ms(20)}>
        <View gap={10}>
          <Pagination length={pages.length} x={x} progress={progress} />
          <View gap={10}>
            <Text fontSize={ms(20)} fontWeight="bold" color="$interactiveBaseBrandDefault" textAlign="center">
              {title}
            </Text>
            {disabled && (
              <View
                backgroundColor="$interactiveBaseBrandDefault"
                paddingHorizontal={ms(4)}
                paddingVertical={ms(2)}
                borderRadius="$r2"
                alignSelf="center"
              >
                <Text
                  textAlign="center"
                  paddingHorizontal={ms(4)}
                  paddingVertical={ms(2)}
                  color="$interactiveBaseBrandSoftDefault"
                  fontSize={ms(11)}
                  fontWeight="bold"
                >
                  COMING SOON
                </Text>
              </View>
            )}
          </View>
        </View>
        <View flexDirection="column" gap={10}>
          <ActionButton
            onPress={() => {
              router.push("../onboarding/(passkeys)/passkeys");
            }}
            iconAfter={<ArrowRight color="$interactiveOnBaseBrandDefault" fontWeight="bold" />}
          >
            Get started
          </ActionButton>
          <View justifyContent="center" alignItems="center">
            {button}
          </View>
        </View>
      </View>
    </View>
  );
}
