import React from "react";

import Carousel from "./Carousel.js";
import BaseLayout from "../shared/BaseLayout.js";
import SafeView from "../shared/SafeView.js";

const Onboarding = () => {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <Carousel />
      </BaseLayout>
    </SafeView>
  );
};

export default Onboarding;
