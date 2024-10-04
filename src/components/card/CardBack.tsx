import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Spinner } from "tamagui";

import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";
import View from "../shared/View";

export default function CardBack({ uri, flipped }: { uri: string; flipped: boolean }) {
  const [loading, setLoading] = useState(true);
  const frameStyles = {
    aspectRatio: ISO7810_ASPECT_RATIO,
    border: "none",
    width: "100%",
    height: "100%",
    backgroundColor: "$backgroundSoft",
    opacity: loading ? 0 : 1,
    transition: "opacity 0.3s ease-in-out",
  };
  useEffect(() => {
    if (!flipped) setLoading(true);
  }, [flipped]);
  return (
    <View width="100%" height="100%" backgroundColor="transparent">
      {Platform.OS === "web" ? (
        <iframe
          title="Card"
          allow="clipboard-write"
          id="card-iframe"
          src={uri}
          style={frameStyles}
          onLoad={() => {
            setLoading(false);
          }}
        />
      ) : (
        <WebView
          source={{ uri }}
          renderLoading={LoadingIndicator}
          style={{ backgroundColor: frameStyles.backgroundColor }}
          injectedJavaScript={`
            (function() {
              try {
                document.body.style.opacity = '0';
                document.body.style.backgroundColor = 'transparent';
                document.documentElement.style.backgroundColor = 'transparent';
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.documentElement.style.margin = '0';
                document.documentElement.style.padding = '0';
                const cardData = document.querySelector('#card-data');
                if (cardData) {
                  const styles = {
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    border: "none",
                    borderRadius: "0",
                    boxSizing: "border-box",
                    padding: "0",
                    margin: "0",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    overflow: "hidden",
                    backgroundColor: "transparent",
                  };
                  Object.assign(cardData.style, styles);
                  cardData.style.transform = "none";
                  setTimeout(() => {
                    document.body.style.opacity = "1";
                    window.ReactNativeWebView.postMessage("stylesApplied");
                  }, 100);
                } else {
                  document.body.style.opacity = "1";
                  window.ReactNativeWebView.postMessage("cardDataNotFound");
                }
                document.body.offsetHeight;
              } catch (error) {
                console.error("Error in iframe manipulation:", error);
                window.ReactNativeWebView.postMessage("iframeError");
              }
            })();
          `}
          startInLoadingState
          onMessage={(event) => {
            if (event.nativeEvent.data === "stylesApplied") {
              setLoading(false);
            }
          }}
        />
      )}
      {loading && <LoadingIndicator />}
    </View>
  );
}

function LoadingIndicator() {
  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
      zIndex={3}
      backgroundColor="$backgroundSoft"
    >
      <Spinner color="$interactiveBaseBrandDefault" />
    </View>
  );
}
