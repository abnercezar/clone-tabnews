import "@primer/primitives/dist/css/functional/themes/light.css";

import { ThemeProvider, BaseStyles } from "@primer/react";

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <BaseStyles>
        <Component {...pageProps} />
      </BaseStyles>
    </ThemeProvider>
  );
}
