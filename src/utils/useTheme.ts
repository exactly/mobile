import { useContext } from "react";

import { ThemeContext } from "../components/context/ThemeProvider";

export default function useTheme() {
  const { appearance, setAppearance, theme } = useContext(ThemeContext);
  function toggle() {
    setAppearance(appearance === "dark" ? "light" : "dark");
  }
  return { appearance, setAppearance, theme, toggle };
}
