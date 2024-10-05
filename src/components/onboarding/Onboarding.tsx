import React from "react";

import SafeView from "../shared/SafeView";
import Carousel from "./Carousel";

export default function Onboarding() {
  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen>
      <Carousel />
    </SafeView>
  );
}
