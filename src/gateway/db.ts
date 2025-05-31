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
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)}:\n`,
      error,
    );
    throw error;
  }
}

export async function genericApacheIPC<T>(
  cmd: string,
  args?: InvokeArgs,
): Promise<T[]> {
  try {
    const table = await apacheIPC(cmd, args);
    return table.toArray() as Array<T>;
  } catch (error) {
    console.error(
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)} and casting result:\n`,
      error,
    );
    throw error;
  }
}
