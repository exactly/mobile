import { ArrowRight } from "@phosphor-icons/react";
import { type Href, Link } from "expo-router";
import type { ReactNode } from "react";
import React from "react";
import type { ButtonProps } from "tamagui";

import Button from "./Button";

export default function LinkButton(
  properties: ButtonProps & { href: Href<string>; secondary?: boolean; actionIcon?: ReactNode },
) {
  return (
    <Link href={properties.href} style={fullWidth}>
      <Button actionIcon={properties.actionIcon || <ArrowRight />} width="100%" secondary={properties.secondary}>
        {properties.children}
      </Button>
    </Link>
  );
}
const fullWidth = { width: "100%" } as const;
