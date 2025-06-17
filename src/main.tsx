import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./styles/index.css";
import "primereact/resources/themes/lara-light-blue/theme.css";

/**
 * React application entry point for the Energy Model Visualizer.
 *
 * Initialization:
 * - Sets up Mantine UI component library with default theme
 * - Renders main App component into DOM root element
 * - Integrates with Tauri's WebView for desktop application functionality
 *
 */

// Create a custom theme (optional)
const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Outfit, sans-serif",
  fontFamilyMonospace: "Monaco, Courier, monospace",
  headings: { fontFamily: "Outfit, sans-serif" },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
