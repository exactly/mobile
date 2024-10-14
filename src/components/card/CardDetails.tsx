import { X } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, Sheet } from "tamagui";
import { nonEmpty, pipe, safeParse, string, url } from "valibot";

import CardBack from "./CardBack";
import DismissableAlert from "./DismissableAlert";
import queryClient from "../../utils/queryClient";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function CardDetails({ open, onClose, uri }: { open: boolean; onClose: () => void; uri?: string }) {
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const { success, output } = safeParse(pipe(string(), nonEmpty("empty url"), url("bad url")), uri);
  return (
    <Sheet
      open={open}
      dismissOnSnapToBottom
      unmountChildrenWhenHidden
      forceRemoveScrollEnabled={open}
      animation="moderate"
      dismissOnOverlayPress
      onOpenChange={onClose}
      snapPointsMode="fit"
      zIndex={100_000}
      modal
    >
      <Sheet.Overlay
        backgroundColor="#00000090"
        animation="quicker"
        enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
        exitStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
      />
      <Sheet.Handle />
      <Sheet.Frame>
        <SafeView paddingTop={0} fullScreen borderTopLeftRadius="$r4" borderTopRightRadius="$r4">
          <ScrollView>
            <View fullScreen flex={1}>
              <View gap="$s5" flex={1} padded alignContent="space-between">
                {success && <CardBack uri={output} />}
                {success && alertShown && (
                  <DismissableAlert
                    text="Manually add your card to Apple Pay & Google Pay to make contactless payments."
                    onDismiss={() => {
                      queryClient.setQueryData(["settings", "alertShown"], false);
                    }}
                  />
                )}
                <Button
                  main
                  noFlex
                  outlined
                  spaced
                  iconAfter={<X size={ms(20)} color="$interactiveOnBaseBrandSoft" fontWeight="bold" />}
                  onPress={onClose}
                >
                  Close
                </Button>
              </View>
            </View>
          </ScrollView>
        </SafeView>
      </Sheet.Frame>
    </Sheet>
  );
}
