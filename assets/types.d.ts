import type { ImageSourcePropType } from "react-native";

declare module "*.otf" {
  const value: FontSource;
  export default value;
}

declare module "*.png" {
  const value: ImageSourcePropType;
  export = value;
}
