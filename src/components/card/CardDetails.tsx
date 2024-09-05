import React from "react";
import { Platform } from "react-native";
import { ms } from "react-native-size-matters";
import { WebView } from "react-native-webview";
import { Spinner, styled } from "tamagui";

import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";
import View from "../shared/View";

const StyledWebView = styled(WebView, {});

const style = {
  height: 220,
  borderRadius: ms(5),
  backgroundColor: "transparent",
  aspectRatio: ISO7810_ASPECT_RATIO,
  padding: ms(5),
};

export default function CardDetails({ uri }: { uri: string }) {
  return (
    <View
      borderRadius="$r3"
      overflow="hidden"
      maxHeight={220}
      width="100%"
      aspectRatio={ISO7810_ASPECT_RATIO}
      alignSelf="center"
    >
      {Platform.OS === "web" ? (
        <iframe id="card-iframe" src={uri} style={style} />
      ) : (
        <StyledWebView
          source={{ uri }}
          backgroundColor="transparent"
          startInLoadingState
          renderLoading={() => (
            <View position="absolute" top={0} left={0} right={0} bottom={0} alignItems="center" justifyContent="center">
              <Spinner color="$interactiveBaseBrandDefault" />
            </View>
          )}
          injectedJavaScript={`
          (function() {
            const cardData = document.querySelector('#card-data');
            if (cardData) {
              cardData.style.width = '100%';
              cardData.style.height = '100%';
              cardData.style.border = 'none';
              cardData.style.borderRadius = '0';
              cardData.style.boxSizing = 'border-box';
              cardData.style.padding = '10px';
              cardData.style.backgroundSize = 'cover';
              cardData.style.backgroundPosition = 'center';
            }
          })();`}
        />
      )}
    </View>
  );
}
