import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

interface InfoPreviewProperties {
  title: string;
  children?: React.ReactNode;
  renderAction?: React.ReactNode;
}

const InfoPreview = ({ children, title, renderAction }: InfoPreviewProperties) => {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius={10} padding={ms(20)} gap={ms(20)}>
      <View flexDirection="row" gap={ms(10)} alignItems="center" justifyContent="space-between">
        <Text color="$textPrimary" fontSize={17} fontWeight="bold" flex={1}>
          {title}
        </Text>
        {renderAction}
      </View>
      {children}
    </View>
  );
};

export default InfoPreview;
