import React, { useState } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Spinner, styled } from "tamagui";

const StyledWebView = styled(WebView, {});

const style = {
  height: "100%",
  width: "100%",
  backgroundColor: "transparent",
};

export default function CardDetails({ uri }: { uri: string }) {
  const [webViewHeight, setWebViewHeight] = useState(0);
  return Platform.OS === "web" ? (
    <iframe src={uri} style={style} />
  ) : (
    <StyledWebView
      onMessage={(event) => {
        setWebViewHeight(Number(event.nativeEvent.data));
      }}
      height={webViewHeight + 10}
      backgroundColor="transparent"
      flex={1}
      scrollEnabled={false}
      source={{ uri }}
      startInLoadingState
      renderLoading={() => <Spinner color="$interactiveBaseBrandDefault" />}
      injectedJavaScript="window.ReactNativeWebView.postMessage(document.body.scrollHeight)"
    />
  );
}
