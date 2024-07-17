import { router } from "expo-router";
import { ArrowRight } from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TouchableOpacity, type ViewToken } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { moderateScale, scale } from "react-native-size-matters";
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
  <TouchableOpacity onPress={() => {}}>
    <Text fontSize={scale(13)} fontWeight={600} color="$interactiveBaseBrandDefault">
      Recover an existing account
    </Text>
  </TouchableOpacity>
);

export interface Page {
  content: string;
  contentSecondary?: string;
  image: React.FC<SvgProps>;
  backgroundImage: React.FC<SvgProps>;
  available?: boolean;
  button?: React.ReactNode;
}

const pages: Page[] = [
  {
    content: "The first onchain debit & credit card",
    image: exaCard,
    backgroundImage: blob1,
    button: recoverButton,
  },
  {
    content: "Buy now, pay later, and hold your crypto",
    image: calendar,
    backgroundImage: blob2,
    button: recoverButton,
  },
  {
    content: "Maximize earnings, effortlessly.",
    image: earnings,
    backgroundImage: blob3,
    button: recoverButton,
  },
  {
    content: "In-store QR payments, with crypto",
    image: qrCode,
    backgroundImage: blob4,
    button: recoverButton,
    available: false,
  },
];

const Carousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListReference = useRef<Animated.FlatList<Page>>(null);
  const x = useSharedValue(0);
  const progress = useSharedValue(0);
  const currentItem = pages[activeIndex] || (pages[0] as Page);
  const { content, contentSecondary, button } = currentItem;

  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const newValue = (viewableItems.length > 0 && viewableItems[0] !== undefined && viewableItems[0].index) || 0;
    setActiveIndex(newValue);
    progress.value = 0;
  };

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
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
      />

      <View flexDirection="column" paddingVertical={moderateScale(10)} paddingHorizontal={moderateScale(20)} gap={10}>
        <View gap={10}>
          <View>
            <Pagination length={pages.length} x={x} progress={progress} />
          </View>

          <View gap={10}>
            <Text fontSize={scale(20)} fontWeight={700} color="$interactiveBaseBrandDefault" textAlign="center">
              {content}
            </Text>
            {contentSecondary && (
              <Text fontSize={13} fontWeight={400} color="$uiBaseSecondary" textAlign="center">
                {contentSecondary}
              </Text>
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
};

export default Carousel;
