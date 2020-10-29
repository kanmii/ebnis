import { regServiceWorkerReactEnv } from "./utils/env-variables";

export async function register() {
  if (process.env[regServiceWorkerReactEnv] && "serviceWorker" in navigator) {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/service-worker.js");
    wb.register();
  }
}
