import { useEffect, useState } from 'react';
import DuckDB, { useDuckDB } from '@jetblack/duckdb-react';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as React from "react";

function App() {
  const [count, setCount] = useState(0)
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Get the DuckDB context from the hook.
  const { db, loading, error } = useDuckDB()


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

  useEffect(() => {
    if (loading || !db || error) {
      return
    }
    if(file) {
        db.open(file).then(() => {
            console.log("Database uploaded successfully.");

        }).catch(error => {
            console.error(error);
        });
    }

  }, [loading, file, db, error])

  return (
    <>
        <div>
            <h2>Upload a DuckDB File</h2>

            <input type="file" accept=".duckdb" onChange={handleFileUpload} />
            {loading && <p>Loading DuckDB...</p>}
            {error && <p>Error: {error.toString()}</p>}

            {file && <p>Selected file: {file.name}</p>}
            {message && <p>{message}</p>}
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
        <DuckDB>
            <App />
        </DuckDB>
    );
}

export default WrappedApp;
