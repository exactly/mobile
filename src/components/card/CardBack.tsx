import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Spinner } from "tamagui";

import View from "../shared/View";
import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";

export default function CardBack({ flipped, uri }: { flipped: boolean; uri: string }) {
  const [loading, setLoading] = useState(true);
  const frameStyles = {
    aspectRatio: ISO7810_ASPECT_RATIO,
    backgroundColor: "$backgroundSoft",
    border: "none",
    height: "100%",
    opacity: loading ? 0 : 1,
    transition: "opacity 0.3s ease-in-out",
    width: "100%",
  };
  useEffect(() => {
    if (!flipped) setLoading(true);
  }, [flipped]);
  return (
    <View backgroundColor="transparent" height="100%" width="100%">
      {Platform.OS === "web" ? (
        <iframe
          allow="clipboard-write"
          id="card-iframe"
          onLoad={() => {
            setLoading(false);
          }}
          src={uri}
          style={frameStyles}
          title="Card"
        />
      ) : (
        <WebView
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
          onMessage={(event) => {
            if (event.nativeEvent.data === "stylesApplied") {
              setLoading(false);
            }
          }}
          renderLoading={LoadingIndicator}
          source={{ uri }}
          startInLoadingState
          style={{ backgroundColor: frameStyles.backgroundColor }}
        />
      )}
      {loading && <LoadingIndicator />}
    </View>
  );
}

function LoadingIndicator() {
  return (
    <View
      alignItems="center"
      backgroundColor="$backgroundSoft"
      bottom={0}
      justifyContent="center"
      left={0}
      position="absolute"
      right={0}
      top={0}
      zIndex={3}
    >
      <Spinner color="$interactiveBaseBrandDefault" />
    </View>
  );
}
