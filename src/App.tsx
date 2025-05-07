import { useEffect, useState, ChangeEvent } from 'react';
import DuckDB, { useDuckDB } from '@jetblack/duckdb-react';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as React from "react";
import { VITE_BUNDLES } from './duckdbBundles';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm'
import { Table, Schema } from 'apache-arrow'
import { isDOMComponent } from 'react-dom/test-utils';

function App() {
  const [count, setCount] = useState(0)
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableData, setSelectedTableData] = useState<Table<any> | null>(null);
  const [isDBOpenReact, setIsDBOpenReact] = useState<boolean>(false); //it needs a regular and state version because some functions require one while other require the other, look into how to fix this later

  // Get the DuckDB context from the hook.
  const { db, loading, error } = useDuckDB()

  var isDBOpen: Boolean = false;

  // Upload a DuckDB file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      let uploadedFile = null;

      if (e.target.files) {
          uploadedFile = e.target.files[0];
      } else {
          uploadedFile = null;
      }
      if (uploadedFile) {
          setMessage(null);
          if (uploadedFile.name.endsWith('.duckdb')) {
              setFile(uploadedFile);
              setMessage('File selected successfully.');
          } else {
              setFile(null);
              setMessage('Please upload a valid DuckDB database file (.duckdb)');
          }
      }
  }

  // open new DB whenever a new file is chosen.
  useEffect(() => {
    if (loading || !db || error || !file) {
      return;
    }

    (async () => {
      const arrayBuffer = await file.arrayBuffer();
      await db.registerFileBuffer('/mydb.duckdb', new Uint8Array(arrayBuffer));
      await db.open({ path: '/mydb.duckdb' });
      console.log("Database opened successfully.");

      isDBOpen = true;
      setIsDBOpenReact(true);
      updateTables(db);
    })()
  }, [loading, db, file]);

  // db: database
  // q: a query to be run
  async function queryDB(db: AsyncDuckDB | undefined, q: string): Promise<Table<any>> {
    if (!db) {
      throw "DB is undefined!"
    }
    if (!isDBOpen && !isDBOpenReact) {
      throw "DB not open yet!"
    }

    try {
      // Query the DB
      const conn = await db.connect();
      const result = conn.query(q);
      await conn.close();
      return result;

    } catch (err) {
      console.error("Error opening or querying DB:", err);
      throw err; //propagate
    }
  }

  //keep track of tables present
  function updateTables(db: AsyncDuckDB): void { //should return later
    (async () => {
      const table: Table<any> = await queryDB(db, "SHOW TABLES;");
      const names: any[] = table.toArray().map((v: any) => v["name"])
      setTables(names as string[]);
    })()
  }

  // selecting a different table
  const selectTable = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedTable(e.target.value);
    console.log("Table selected:", e.target.value)
  }

  // update selectedTableData when a new table is chosen
  useEffect(() => {
    if (!selectedTable) {
      console.log("selected table null!")
      return
    }
    
    console.log("updating!");
    (async () => {
      setSelectedTableData(await queryDB(db, `SELECT * FROM ${selectedTable}`));
      console.log("tabledata updated!");
    })()
  }, [selectedTable])

  function createVisualTable(table: Table<any>): JSX.Element {
    const rows: any[] = table.toArray();
    const schema: string[] = table.schema.fields.map((v: any) => v["name"]);
    return (
      <table id="visualTable"> 
        <thead>
          {schema.map((n: string, idx: number) => {
              return <th key={idx}>{n}</th>
            })
          }
        </thead>
        <tbody>
          {rows.map((r: any, x: number) => {
            const row: any[] = r.toArray();
            return (
              <tr key={x}> 
                {row.map((d: any, y: number) => <td key={y}>{d}</td>)}
              </tr>
            );})
          }
        </tbody>
      </table>
    );
  }

  return (
    <>
        <div>
            <h2>Upload a DuckDB File</h2>

            <input type="file" accept=".duckdb" onChange={handleFileUpload} />
            {loading && <p>Loading DuckDB...</p>}
            {error && <p>Error: {error.toString()}</p>}

            {file && <p>Selected file: {file.name}</p>}
            {message && <p>{message}</p>}

            {tables.length != 0 ? (
              <select onChange={selectTable}> {
                tables.map((name:string, idx: number) => (<option key={idx}>{name}</option>))
              } </select>
            ): (
              <p> empty </p>
            )}

            {selectedTableData && createVisualTable(selectedTableData)}
        </div>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

// Wraps App with DuckDB provider to provide context for DuckDB functionality.
function WrappedApp() {
    return (
        <DuckDB bundles={VITE_BUNDLES}>
            <App />
        </DuckDB>
    );
}

export default WrappedApp;
