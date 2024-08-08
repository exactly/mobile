import React from "react";

import Carousel from "./Carousel";
import SafeView from "../shared/SafeView";

export default function Onboarding() {
  return (
    <SafeView fullScreen backgroundColor="$backgroundSoft">
      <Carousel />
    </SafeView>
  );
}
