import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { FamilyApp } from "./FamilyApp.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {import.meta.env.MODE === 'family' ? <FamilyApp /> : <App />}
  </React.StrictMode>,
);
