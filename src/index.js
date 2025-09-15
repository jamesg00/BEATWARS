import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import { Auth0Provider } from "@auth0/auth0-react";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));

const onRedirectCallback = (appState) =>
  window.history.replaceState({}, document.title, appState?.returnTo || "/");

root.render(
  <BrowserRouter>
    <Auth0Provider
      domain="dev-mp31kugugjkdsqe3.us.auth0.com"
      clientId="O5I7wq3CMsAcT1uanB8rHAKOH0blqTJw"
      authorizationParams={{ redirect_uri: "http://localhost:3000" }}
      onRedirectCallback={onRedirectCallback}
    >
      <App />
    </Auth0Provider>
  </BrowserRouter>
);

reportWebVitals();
