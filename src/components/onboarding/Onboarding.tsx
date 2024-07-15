import React from "react";

import Carousel from "./Carousel";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

const Onboarding = () => {
  return (
    <SafeView>
      <BaseLayout>
        <Carousel />
      </BaseLayout>
    </SafeView>
  );
};

export default Onboarding;
