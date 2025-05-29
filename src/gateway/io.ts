import { open } from "@tauri-apps/plugin-dialog";

export async function triggerDuckDBFileDialog(): Promise<string | null> {
  return await open({
    multiple: false,
    filters: [
      {
        name: "DuckDB Files",
        extensions: ["duckdb"],
      },
    ],
  });
}
