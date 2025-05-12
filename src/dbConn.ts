import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC } from "apache-arrow"

export async function runTest() {
    // idk if these types will function correctly
    console.log("test");

    let byteArr: Uint8Array = await invoke<Uint8Array>("run_serialize_query", { q: "SHOW TABLES" });

    let table = tableFromIPC(byteArr);

    console.log("byte-arr:", byteArr);
    console.log("table:", table);
    console.log("num rows:", table.numRows);
}