import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { readAgentUiChromeFlags } from "./embedChrome";
import { applyDocumentTheme, resolveEffectiveTheme } from "./embedTheme";
import "./styles.css";

applyDocumentTheme(resolveEffectiveTheme(readAgentUiChromeFlags().theme));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
