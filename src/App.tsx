import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import DatabaseViewer from "./components/DatabaseViewer";
import "./App.css";
import { runTest } from "./dbConn";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<String | null>(null);

  async function selectDuckDBFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "DuckDB Files",
            extensions: ["duckdb"],
          },
        ],
      });

      if (typeof selected === "string") {
        await invoke("set_path", { path: selected });
        setSelectedFile(selected);
        console.log("Selected file:", selected);
      } else {
        console.log("No file selected.");
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  }

  return (
    <main className="container">
      <h2> Select a DuckDB file test v2</h2>

      <button onClick={selectDuckDBFile}> Select file </button>
      {selectedFile && <p>Selected file: {selectedFile}</p>}

      <h1>DuckDB Viewer</h1>
      <DatabaseViewer />

      <button onClick={runTest}> Test Query </button>
    </main>
  );
}
