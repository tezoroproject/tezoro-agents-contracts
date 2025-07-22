import { injectWidget } from "./inject-widget";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

injectWidget("root");
