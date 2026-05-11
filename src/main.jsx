import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0f172a",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "18px"
        }
      }}
    />

    <App />
  </React.StrictMode>
);