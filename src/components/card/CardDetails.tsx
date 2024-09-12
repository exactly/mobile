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
          width="100%"
          height="100%"
          renderLoading={() => LoadingIndicator}
          startInLoadingState
        />
      )}
    </View>
  );
}

const StyledWebView = styled(WebView, {});
const styles = {
  aspectRatio: ISO7810_ASPECT_RATIO,
  border: "none",
  width: "100%",
  height: "100%",
};

const LoadingIndicator = (
  <View position="absolute" top={0} left={0} right={0} bottom={0} alignItems="center" justifyContent="center">
    <Spinner color="$interactiveBaseBrandDefault" />
  </View>
);
