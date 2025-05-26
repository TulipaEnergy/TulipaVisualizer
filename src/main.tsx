import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./styles/index.css";

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
