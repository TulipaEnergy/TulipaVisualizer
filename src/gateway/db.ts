import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";
import { LRUCache } from "lru-cache";

// Cache instance to be used throughout the session
const cache = new LRUCache<string, any>({
  maxSize: 5000,
  sizeCalculation: (value: any, _: string) => {
    const noRows = (value as Array<any>).length;
    console.log(`Saving ${noRows} rows`);
    return noRows + 1;
  },
});

// helper to abstract from invoke and IPC
export async function apacheIPC(
  cmd: string,
  args?: InvokeArgs,
): Promise<Table<any>> {
  try {
    const buffer = await invoke<ArrayBuffer>(cmd, args);
    const byteArr = new Uint8Array(buffer);
    const table = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error(
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)}:\n`,
      error,
    );
    throw error;
  }
}

function getCacheKey(cmd: string, args?: InvokeArgs): string {
  const key = `${cmd}::${JSON.stringify(args ?? {})}`;
  console.log(`Key ${key}`);
  return key;
}

export async function genericApacheIPC<T>(
  cmd: string,
  args?: InvokeArgs,
): Promise<T[]> {
  const cacheKey = getCacheKey(cmd, args);
  const cached = cache.get(cacheKey);
  if (cached) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return cached as T[];
  }
  try {
    const table = await apacheIPC(cmd, args);
    const result = table.toArray() as Array<T>;
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)} and casting result:\n`,
      error,
    );
    throw error;
  }
}
