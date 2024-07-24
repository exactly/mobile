import React, { useState } from "react";
import { WebView } from "react-native-webview";
import { Spinner, styled } from "tamagui";

const StyledWebView = styled(WebView, {});

export default function CardDetails({ uri }: { uri: string }) {
  const [webViewHeight, setWebViewHeight] = useState(0);
  return (
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
