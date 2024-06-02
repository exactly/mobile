import type { ReactNode } from "react";
import React from "react";
import { Sheet } from "tamagui";
export default function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} modal position={0} animation="medium" onOpenChange={onClose} snapPointsMode="fit">
      <Sheet.Overlay animation="lazy" enterStyle={invisible} exitStyle={invisible} />
      <Sheet.Frame paddingTop="16px" paddingBottom="40px" backgroundColor="$backgroundSoft">
        <Sheet.Handle
          backgroundColor="$borderSeparator"
          height="4px"
          width="40px"
          marginLeft="auto"
          marginRight="auto"
        />
        {children}
      </Sheet.Frame>
    </Sheet>
  );
}

const invisible = { opacity: 0 };
