import { Dot } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";

import ExaCard from "../../assets/images/card.svg";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardFront({ lastFour }: { lastFour?: string }) {
  return (
    <View width="100%" height="100%">
      <ExaCard width="100%" height="100%" />
      <View position="absolute" flexDirection="row" gap="$s2" bottom={ms(10)} left={ms(10)}>
        <View flexDirection="row" gap="$s2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Dot
              key={index}
              color="white"
              size={ms(17)}
              transform={[{ translateX: index * ms(12) * -1 }, { translateY: 1 }]}
            />
          ))}
        </View>
        <Text
          color="white"
          emphasized
          callout
          paddingTop={lastFour ? 0 : ms(3)}
          transform={[{ translateX: ms(40) * -1 }]}
        >
          {lastFour}
        </Text>
      </View>
    </View>
  );
}
