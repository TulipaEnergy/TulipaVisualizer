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

// provide relative path from 11c/src-tauri/tauri.conf.json
export async function readJSON(path: string) {
  const resourcePath = await resolveResource(path);
  return JSON.parse(await readTextFile(resourcePath));
}

// provide relative path from 11c/src-tauri/tauri.conf.json -> assets/docs/user-guide.md
export async function readString(path: string) {
  const resourcePath = await resolveResource(path);
  console.log(resourcePath)
  return await readTextFile(resourcePath);
}
