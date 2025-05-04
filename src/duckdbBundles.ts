// Configures and exports the necessary DuckDB WASM bundles (main module and worker) for Vite
import { DuckDBBundles } from '@duckdb/duckdb-wasm';
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdbEHWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdbEHWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export const VITE_BUNDLES: DuckDBBundles = {
  mvp: {
    mainModule: duckdbMvpWasm,
    mainWorker: duckdbMvpWorker,
  },
  eh: {
    mainModule: duckdbEHWasm,
    mainWorker: duckdbEHWorker,
  },
};