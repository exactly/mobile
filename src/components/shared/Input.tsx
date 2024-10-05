import { Input, styled } from "tamagui";

export default styled(Input, {
  borderColor: "$borderBrandStrong",
  borderRadius: "$r3",
  color: "$uiNeutralPrimary",
  focusStyle: { borderColor: "$borderBrandStrong" },
  focusVisibleStyle: { borderColor: "$borderBrandStrong", outlineColor: "$borderBrandStrong", outlineWidth: 0 },
  fontSize: 15,
  padding: "$s3",
  placeholderTextColor: "$uiNeutralSecondary",
  variants: {
    neutral: {
      true: {
        backgroundColor: "transparent",
        borderColor: "$borderNeutralSoft",
        focusStyle: { borderColor: "$borderBrandStrong" },
        focusVisibleStyle: { borderColor: "$borderBrandStrong", outlineColor: "$borderBrandStrong", outlineWidth: 0 },
        placeholderTextColor: "$uiNeutralSecondary",
      },
    },
  },
});
