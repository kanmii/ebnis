/* istanbul ignore file */
import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import reportWebVitals from "./reportWebVitals";
import "@fortawesome/fontawesome-free/css/all.css";
import "./styles/tailwind-before.css";
import "./styles/globals.scss";
import "./styles/globals.css";
import "./styles/tailwind-after.css";
import App from "./components/App/app.component";
import { regServiceWorkerReactEnv } from "./utils/env-variables";
import { useMsw } from "./utils/env-variables";

if (useMsw) {
  require("@eb/cm/src/__tests__/use-msw");
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
if (regServiceWorkerReactEnv) {
  serviceWorkerRegistration.register();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
