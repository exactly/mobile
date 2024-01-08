declare module "*.otf" {
  const value: FontSource;
  export default value;
}
declare module "*.svg" {
  import type React from "react";
  import type { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}
