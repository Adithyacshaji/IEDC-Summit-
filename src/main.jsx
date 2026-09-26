import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DatabaseProvider } from "./context/DatabaseContext";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </BrowserRouter>
  </React.StrictMode>
);