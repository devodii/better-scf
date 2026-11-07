import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import tokens from "../../extension/entrypoints/scf.content/styles/tokens.scss?inline";
import { Changelog } from "./components/Changelog";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import "./global.scss";

const tokenStyle = document.createElement("style");
tokenStyle.textContent = tokens.replaceAll(":host", ":root");
document.head.append(tokenStyle);

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Header />
      <main>
        <Changelog />
      </main>
      <Footer />
    </StrictMode>,
  );
}
