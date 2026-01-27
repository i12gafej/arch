import React from "react";
import { createRoot } from "react-dom/client";
import App from "./presentation/App.jsx";
import "./presentation/styles/styles.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
