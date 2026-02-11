import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

const container = document.getElementById("root");
const root = createRoot(container);

registerServiceWorker();

root.render(
  <App />
);
