import { ScrollViewStyleReset } from "expo-router/html";
import React, { type ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
        <link
          rel="preload"
          href="src/assets/fonts/BDOGrotesk-Bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="src/assets/fonts/BDOGrotesk-Regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="src/assets/fonts/IBMPlexMono-Bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="src/assets/fonts/IBMPlexMono-Regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="src/assets/fonts/IBMPlexMono-SemiBold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

const fontStyles = `
@font-face { font-family: BDOGrotesk-Bold; src: url(src/assets/fonts/BDOGrotesk-Bold.otf); font-display: auto; }
@font-face { font-family: BDOGrotesk-Regular; src: url(src/assets/fonts/BDOGrotesk-Regular.otf); font-display: auto; }
@font-face { font-family: IBMPlexMono-Bold; src: url(src/assets/fonts/IBMPlexMono-Bold.otf); font-display: auto; }
@font-face { font-family: IBMPlexMono-Regular; src: url(src/assets/fonts/IBMPlexMono-Regular.otf); font-display: auto; }
@font-face { font-family: IBMPlexMono-SemiBold; src: url(src/assets/fonts/IBMPlexMono-SemiBold.otf); font-display: auto; }`;
