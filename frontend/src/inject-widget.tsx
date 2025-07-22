import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LocalStorageProvider } from "./providers/LocalStorageProvider";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./blockchain/config";
import globals from "./styles/globals.css?inline";
import switzerFontMedium from "./styles/fonts/Switzer-Medium.woff2?inline";
import switzerFontRegular from "./styles/fonts/Switzer-Regular.woff2?inline";
import { TezoroProvider } from "./providers/TezoroProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { ConfirmationProvider } from "./providers/ConfirmationProvider";

function createShadowRootWithStyles(
  container: HTMLElement,
  css: string
): ShadowRoot {
  const shadowRoot = container.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  shadowRoot.appendChild(style);
  return shadowRoot;
}

function dataURLToBlobURL(dataURL: string): string {
  const [metadata, base64Data] = dataURL.split(",");

  if (!metadata || !base64Data) {
    throw new Error("Invalid data URL: missing parts");
  }

  const mimeMatch = metadata.match(/data:(.*?);base64/);
  if (!mimeMatch) {
    throw new Error("Invalid data URL: mime type not found");
  }

  const mime = mimeMatch[1];

  const binary = atob(base64Data);
  const buffer = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([buffer], { type: mime });
  return URL.createObjectURL(blob);
}

const createFontFaceFromDataURL = (
  name: string,
  dataURL: string,
  options: FontFaceDescriptors
): FontFace => {
  const blobURL = dataURLToBlobURL(dataURL);
  return new FontFace(name, `url(${blobURL})`, options);
};

const fontFaces = [
  createFontFaceFromDataURL("Switzer", switzerFontRegular, {
    weight: "400",
    style: "normal",
    display: "swap",
  }),
  createFontFaceFromDataURL("Switzer", switzerFontMedium, {
    weight: "500",
    style: "normal",
    display: "swap",
  }),
];

async function injectFonts(): Promise<void> {
  const [regular, medium] = await Promise.all(fontFaces.map((f) => f.load()));

  for (const face of [regular, medium]) {
    if (face) {
      if (face.status === "loaded") {
        document.fonts.add(face);
      } else {
        console.warn(`Font "${face.family}" failed to load`);
      }
    } else {
      console.warn(`Font face is undefined`);
    }
  }
}

function replaceGlobalSelectors(css: string): string {
  return css
    .replace(/:root/gu, ":host")
    .replace(/html/gu, ":host")
    .replace(/body/gu, ":host");
}

export async function injectWidget(rootId: string) {
  await injectFonts();

  const rootElement = document.getElementById(rootId);
  if (!rootElement) return;

  rootElement.style.display = "contents";

  // Hack: make tailwind work in shadow DOM
  // https://github.com/tailwindlabs/tailwindcss/issues/15005#issuecomment-2737489813
  // https://github.com/tailwindlabs/tailwindcss/discussions/16772

  const css = `
    ${replaceGlobalSelectors(globals)}
    :host {
      font-family: "Switzer", system-ui, sans-serif;
    }
  `;

  const shadowRoot = createShadowRootWithStyles(rootElement, css);

  const container = document.createElement("div");
  container.style.display = "contents";
  shadowRoot.appendChild(container);

  localStorage.setItem("tzo_container_id", rootId);

  const queryClient = new QueryClient();
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ToastProvider>
        <ConfirmationProvider>
          <LocalStorageProvider>
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <TezoroProvider>
                  <App />
                </TezoroProvider>
              </QueryClientProvider>
            </WagmiProvider>
          </LocalStorageProvider>
        </ConfirmationProvider>
      </ToastProvider>
    </StrictMode>
  );
}
