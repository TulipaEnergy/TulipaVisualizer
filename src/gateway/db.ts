import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

// helper to abstract from invoke and IPC
export async function apacheIPC(
  cmd: string,
  args?: InvokeArgs,
): Promise<Table<any>> {
  try {
    let buffer = await invoke<ArrayBuffer>(cmd, args);
    let byteArr = new Uint8Array(buffer);
    let table = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error(
      `Error executing query {endpoint: ${cmd}, args: ${args}:\n`,
      error,
    );
    throw error;
  }
}
