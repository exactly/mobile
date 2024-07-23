import React from "react";

import Carousel from "./Carousel";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

export default function Onboarding() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <Carousel />
      </BaseLayout>
    </SafeView>
  );
}
