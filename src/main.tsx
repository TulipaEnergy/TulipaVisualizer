import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./styles/index.css";
import "primereact/resources/themes/lara-light-blue/theme.css";

/**
 * React application entry point for the Energy Model Visualizer desktop application.
 *
 * This file initializes the React application within a Tauri WebView environment,
 * providing the foundation for cross-platform desktop functionality with web technologies.
 *
 * ## Technology Integration:
 * - **React 18**: Uses new createRoot API for improved concurrent rendering
 * - **Mantine UI**: Comprehensive component library with custom theme configuration
 * - **Tauri WebView**: Renders within native desktop window with Rust backend IPC
 * - **TypeScript**: Strict typing with proper DOM element casting
 *
 * ## Theme Configuration:
 * - Custom theme extends Mantine defaults with project-specific design tokens
 * - Consistent typography using Outfit font family for modern appearance
 * - Monospace font specified for code and data display elements
 * - Primary color set to blue to match energy visualization color schemes
 *
 * ## CSS Loading Order:
 * 1. Mantine core styles (base component styling)
 * 2. Mantine dates styles (calendar/date picker components)
 * 3. Custom application styles (project-specific overrides)
 * 4. PrimeReact theme (legacy components, may be removed in future)
 *
 * ## Desktop Environment:
 * - Integrates seamlessly with Tauri's window management
 * - Supports native file dialogs and system integration via IPC
 * - Optimized for desktop interaction patterns (keyboard shortcuts, context menus)
 * - Automatic dark/light mode detection through system preferences
 *
 * @see {@link https://tauri.app/} - Tauri framework documentation
 * @see {@link https://mantine.dev/} - Mantine UI component library
 */

/**
 * Custom Mantine theme configuration for the Energy Model Visualizer.
 * 
 * Defines the visual identity and design system used throughout the application:
 * - Consistent color palette optimized for data visualization
 * - Typography hierarchy suitable for technical data presentation
 * - Component defaults that enhance accessibility and usability
 */
const theme = createTheme({
  /** Primary brand color used for buttons, links, and interactive elements */
  primaryColor: "blue",
  
  /** Main font family for UI text - modern, readable sans-serif */
  fontFamily: "Outfit, sans-serif",
  
  /** Monospace font for data display, code blocks, and technical content */
  fontFamilyMonospace: "Monaco, Courier, monospace",
  
  /** Typography settings for heading elements (h1-h6) */
  headings: { fontFamily: "Outfit, sans-serif" },
  
  // Future theme extensions can be added here:
  // - Custom color schemes for data visualization
  // - Component-specific styling overrides
  // - Responsive breakpoint customizations
});

/**
 * Application initialization and root rendering.
 * 
 * React.StrictMode enables additional development-time checks:
 * - Detects unsafe lifecycles and deprecated APIs
 * - Warns about side effects in render methods
 * - Validates proper component patterns
 * 
 * MantineProvider supplies theme context to all child components,
 * enabling consistent styling and design system usage throughout the app.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
