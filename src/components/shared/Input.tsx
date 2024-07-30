import { Input, styled } from "tamagui";

export default styled(Input, {
  fontWeight: "bold",
  fontSize: 15,
  padding: "$s3",
  borderColor: "$borderBrandStrong",
  borderRadius: "$r3",
  placeholderTextColor: "$uiNeutralSecondary",
  focusStyle: {
    borderColor: "$interactiveBaseBrandDefault",
  },
});
