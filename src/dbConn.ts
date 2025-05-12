import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC } from "apache-arrow"

export async function runTest() {
    // idk if these types will function correctly
    console.log("test");

    let buffer = await invoke<ArrayBuffer>("run_serialize_query", { q: "SHOW TABLES" });
    let byteArr = new Uint8Array(buffer);
    let table = tableFromIPC(byteArr);

    console.log("byte-arr:", byteArr);
    console.log("table:", table);
    console.log("num rows:", table.numRows);

    for (const row of table) {
        console.log(row.toArray()); // view each row
    }
}