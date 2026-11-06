import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import tokens from "../../extension/entrypoints/scf.content/styles/tokens.scss?inline";
import { App } from "./App";
import "./global.scss";

const tokenStyle = document.createElement("style");
tokenStyle.textContent = tokens.replaceAll(":host", ":root");
document.head.append(tokenStyle);

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
