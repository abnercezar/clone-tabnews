import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "interface/CommentEditor/bytemd-overrides.css";

import { useLayoutEffect } from "react";
import { BaseStyles, ThemeProvider, useTheme } from "@primer/react";
import { ConfirmProvider } from "interface/ConfirmDialog";
import { readColorMode } from "interface/colorMode";

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider colorMode="auto" dayScheme="light" nightScheme="dark">
      <ColorModeRestore />
      <BaseStyles>
        <ConfirmProvider>
          <Component {...pageProps} />
        </ConfirmProvider>
      </BaseStyles>
    </ThemeProvider>
  );
}

function ColorModeRestore() {
  const { setColorMode } = useTheme();

  useLayoutEffect(() => {
    setColorMode(readColorMode());
  }, [setColorMode]);

  return null;
}
