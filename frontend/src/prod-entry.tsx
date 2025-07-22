import { injectWidget } from "./inject-widget.tsx";

declare global {
  interface Window {
    TezoroWidget: {
      init: (containerId: string) => void;
    };
  }
}

export function init(containerId: string) {
  injectWidget(containerId);
}
