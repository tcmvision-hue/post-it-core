import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { I18nProvider } from "./i18n/I18nContext";

function isPrivateHostname(hostname) {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (hostname.endsWith(".local")) return true;
  return false;
}

function enforceHttpsOnPublicHost() {
  if (typeof window === "undefined") return;
  const { protocol, hostname, href } = window.location;
  if (protocol !== "http:") return;
  if (isPrivateHostname(hostname)) return;

  const secureUrl = href.replace(/^http:/i, "https:");
  window.location.replace(secureUrl);
}

function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

const container = document.getElementById("root");
const root = createRoot(container);

enforceHttpsOnPublicHost();
registerServiceWorker();

root.render(
  <>
    <I18nProvider>
      <App />
    </I18nProvider>
    <div className="app-global-frame" aria-hidden="true" />
  </>
);
