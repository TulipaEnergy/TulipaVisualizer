import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

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

export async function setDbFilePath(selected: string) {
  await invoke("set_path", { path: selected });
}
