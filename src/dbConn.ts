import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow"

export async function run_query(s: String): Promise<Table<any>> {
    let buffer = await invoke<ArrayBuffer>("run_serialize_query", { q: s });
    let byteArr = new Uint8Array(buffer);
    let table: Table<any> = tableFromIPC(byteArr);
    return table;
}

export function runTest() {
    (async () => {
        let t = await run_query("SHOW TABLES");
        
        console.log(t);
        for (const row of t) {
            console.log(row.toArray()); // view each row
        }
    })()
}