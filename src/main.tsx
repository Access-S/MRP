// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider as MaterialThemeProvider } from "@material-tailwind/react"; // Make sure Material Tailwind's provider is here

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MaterialThemeProvider>
      <App />
    </MaterialThemeProvider>
  </React.StrictMode>
);
