import React, { useState } from "react";
import { Platform } from "react-native";
import { ms } from "react-native-size-matters";
import { WebView } from "react-native-webview";
import { Spinner, styled } from "tamagui";

import View from "../shared/View";

const StyledWebView = styled(WebView, {});

const style = {
  height: "100%",
  minHeight: 212,
  borderRadius: ms(5),
  backgroundColor: "white",
  padding: ms(5),
};

export default function CardDetails({ uri }: { uri: string }) {
  const [webViewHeight, setWebViewHeight] = useState(0);
  return (
    <View height={210} width="100%" borderRadius="$r3" overflow="hidden">
      {Platform.OS === "web" ? (
        <iframe src={uri} style={style} frameBorder={0} marginHeight={0} marginWidth={0} />
      ) : (
        <StyledWebView
          flex={1}
          source={{ uri }}
          onMessage={(event) => {
            setWebViewHeight(Number(event.nativeEvent.data));
          }}
          height={webViewHeight + 20}
          backgroundColor="white"
          scrollEnabled={false}
          startInLoadingState
          renderLoading={() => (
            <View position="absolute" top={0} left={0} right={0} bottom={0} alignItems="center" justifyContent="center">
              <Spinner color="$interactiveBaseBrandDefault" />
            </View>
          )}
          injectedJavaScript="window.ReactNativeWebView.postMessage(document.body.scrollHeight)"
        />
      )}
    </View>
  );
}
