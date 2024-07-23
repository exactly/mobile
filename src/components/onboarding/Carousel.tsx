import { router } from "expo-router";
import { ArrowRight } from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, type ViewToken } from "react-native";
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
import calendar from "../../assets/images/calendar.svg";
import earnings from "../../assets/images/earnings.svg";
import exaCard from "../../assets/images/exa-card.svg";
import blob1 from "../../assets/images/onboarding-blob-01.svg";
import blob2 from "../../assets/images/onboarding-blob-02.svg";
import blob3 from "../../assets/images/onboarding-blob-03.svg";
import blob4 from "../../assets/images/onboarding-blob-04.svg";
import qrCode from "../../assets/images/qr-code.svg";
import DelayedActionButton from "../shared/DelayedActionButton";

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
    title: "The first onchain debit & credit card",
    image: exaCard,
    backgroundImage: blob1,
    button: recoverButton,
  },
  {
    title: "Buy now, pay later, and hold your crypto",
    image: calendar,
    backgroundImage: blob2,
    button: recoverButton,
  },
  {
    title: "Maximize earnings, effortlessly.",
    image: earnings,
    backgroundImage: blob3,
    button: recoverButton,
  },
  {
    title: "In-store QR payments, with crypto",
    image: qrCode,
    backgroundImage: blob4,
    button: recoverButton,
    disabled: true,
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
    <View flex={1}>
      <Animated.FlatList
        ref={flatListReference}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={pages}
        keyExtractor={(_, index) => index.toString()}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 80 }}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
      />
      <View flexDirection="column" paddingVertical={ms(10)} paddingHorizontal={ms(20)} gap={ms(20)}>
        <View gap={10}>
          <View>
            <Pagination length={pages.length} x={x} progress={progress} />
          </View>
          <View gap={10}>
            <Text fontSize={ms(20)} fontWeight="bold" color="$interactiveBaseBrandDefault" textAlign="center">
              {title}
            </Text>
            {disabled && (
              <View
                backgroundColor="$interactiveBaseBrandDefault"
                paddingHorizontal={ms(4)}
                paddingVertical={ms(2)}
                borderRadius={5}
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
          <DelayedActionButton
            content="Get started"
            onPress={() => {
              router.push("onboarding/(passkeys)/passkeys");
            }}
            Icon={ArrowRight}
          />
          <View justifyContent="center" alignItems="center">
            {button}
          </View>
        </View>
      </View>
    </View>
  );
}
