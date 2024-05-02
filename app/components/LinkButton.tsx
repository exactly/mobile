import { Link } from "expo-router";
import React from "react";
import type { ButtonProps } from "tamagui";

import SubmitButton from "./SubmitButton";

export default function LinkButton(properties: ButtonProps & { href: string }) {
  return (
    <Link href={properties.href} style={fullWidth}>
      <SubmitButton width="100%">{properties.children}</SubmitButton>
    </Link>
  );
}
const fullWidth = { width: "100%" } as const;
