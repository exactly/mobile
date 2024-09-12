import React, { useState } from "react";
import { Platform } from "react-native";
import { ms } from "react-native-size-matters";
import { WebView } from "react-native-webview";
import { Spinner, styled } from "tamagui";

import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";
import View from "../shared/View";

export default function CardDetails({ uri }: { uri: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <View
      borderRadius="$r3"
      overflow="hidden"
      width="100%"
      maxWidth={ms(350)}
      aspectRatio={ISO7810_ASPECT_RATIO}
      alignSelf="center"
    >
      {Platform.OS === "web" ? (
        <>
          {loading && LoadingIndicator}
          <iframe
            allow="clipboard-write"
            id="card-iframe"
            src={uri}
            style={styles}
            onLoad={() => {
              setLoading(false);
            }}
          />
        </>
      ) : (
        <StyledWebView
          source={{ uri }}
          backgroundColor="transparent"
          startInLoadingState
          renderLoading={() => LoadingIndicator}
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

const StyledWebView = styled(WebView, {});
const styles = { aspectRatio: ISO7810_ASPECT_RATIO, border: "none" };

const LoadingIndicator = (
  <View position="absolute" top={0} left={0} right={0} bottom={0} alignItems="center" justifyContent="center">
    <Spinner color="$interactiveBaseBrandDefault" />
  </View>
);
