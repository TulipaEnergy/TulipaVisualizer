import { open } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";

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

export async function readJSON(path: string) {
  const resourcePath = await resolveResource(path);
  return JSON.parse(await readTextFile(resourcePath));
}
