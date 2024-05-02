import { ArrowRight } from "@phosphor-icons/react";
import React from "react";
import type { ButtonProps } from "tamagui";

import Button from "./Button";

export default function SubmitButton(properties: ButtonProps) {
  return <Button {...properties} actionIcon={<ArrowRight size="24px" height="24px" />} />;
}
