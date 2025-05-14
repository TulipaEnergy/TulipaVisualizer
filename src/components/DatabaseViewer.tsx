import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./DatabaseViewer.css"; // We'll create this file later for styling
import { tableFromIPC } from "apache-arrow";

interface Table {
  name: string;
  columns: string[];
}

interface QueryResult {
  columns: string[];
  rows: any[][];
}

const DatabaseViewer = () => {
  // File handling state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Tables state
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  // Query state
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  
  // Results state
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load tables when a file is selected
  useEffect(() => {
    if (selectedFile) {
      fetchTables();
    }
  }, [selectedFile]);

  // Update query when a table is selected
  useEffect(() => {
    if (selectedTable) {
      setSqlQuery(`SELECT * FROM ${selectedTable} LIMIT 100;`);
    }
  }, [selectedTable]);

  // File selection handler
  async function handleFileSelect() {
    try {
      setIsLoading(true);
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "DuckDB Files",
            extensions: ["duckdb"],
          },
        ],
      });

      if (typeof selected === "string") {
        await invoke("set_path", { path: selected });
        setSelectedFile(selected);
        setError(null);
      } else {
        console.log("No file selected.");
      }
    } catch (error: any) {
      setError(`Error selecting file: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch available tables
  async function fetchTables() {
    try {
      setIsLoading(true);
      const query = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='main' ORDER BY table_name, ordinal_position";
      const result = await invoke<Uint8Array>("run_serialize_query", { q: query });
      
      // Process the Arrow format data to extract tables
      const table = tableFromIPC(result);
      const tableData: { [key: string]: string[] } = {};
      
      // Process table data
      for (let i = 0; i < table.numRows; i++) {
        const tableName = table.get(i)?.["table_name"]?.toString() || "";
        const columnName = table.get(i)?.["column_name"]?.toString() || "";
        
        if (!tableData[tableName]) {
          tableData[tableName] = [];
        }
        tableData[tableName].push(columnName);
      }
      
      // Convert to Tables array
      const tablesArray: Table[] = Object.entries(tableData).map(([name, columns]) => ({
        name,
        columns
      }));
      
      setTables(tablesArray);
      setError(null);
      
      // Select the first table by default if available
      if (tablesArray.length > 0) {
        setSelectedTable(tablesArray[0].name);
      }
    } catch (error: any) {
      setError(`Error fetching tables: ${error.message || error}`);
      console.error("Error details:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Execute SQL query
  async function executeQuery() {
    if (!sqlQuery.trim()) {
      setError("Query cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      const result = await invoke<Uint8Array>("run_serialize_query", { q: sqlQuery });
      
      // Process the Arrow format data
      const table = tableFromIPC(result);
      
      // Extract column names
      const schema = table.schema;
      const columns = schema.fields.map(field => field.name);
      
      // Extract rows
      const rows: any[][] = [];
      for (let i = 0; i < table.numRows; i++) {
        const row = table.get(i);
        if (row) {
          const rowData = columns.map(col => row[col]);
          rows.push(rowData);
        }
      }
      
      setQueryResult({ columns, rows });
      
      // Add query to history
      setQueryHistory(prev => [sqlQuery, ...prev.slice(0, 9)]);
      
      setError(null);
    } catch (error: any) {
      setError(`Query error: ${error.message || error}`);
      console.error("Query error details:", error);
      setQueryResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  // Load a query from history
  const loadQueryFromHistory = (query: string) => {
    setSqlQuery(query);
  };

  return (
    <div className="database-viewer">
      {/* File Upload Module */}
      <section className="module file-upload-module">
        <h2>Database Connection</h2>
        <div className="file-selection">
          <button onClick={handleFileSelect} disabled={isLoading}>
            {isLoading ? "Loading..." : "Select DuckDB File"}
          </button>
          {selectedFile && <p className="selected-file">File: {selectedFile}</p>}
        </div>
      </section>

      {/* Tables Preview Module */}
      <section className="module tables-preview-module">
        <h2>Tables</h2>
        {tables.length > 0 ? (
          <div className="tables-list">
            {tables.map((table) => (
              <div
                key={table.name}
                className={`table-item ${selectedTable === table.name ? "selected" : ""}`}
                onClick={() => handleTableSelect(table.name)}
              >
                {table.name}
              </div>
            ))}
          </div>
        ) : (
          <p>No tables found. Please select a valid DuckDB file.</p>
        )}
      </section>

      {/* SQL Query Module */}
      <section className="module sql-query-module">
        <h2>SQL Query</h2>
        <div className="query-editor">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            rows={5}
          />
          <div className="query-actions">
            <button onClick={executeQuery} disabled={isLoading || !selectedFile}>
              {isLoading ? "Executing..." : "Run Query"}
            </button>
            <button onClick={() => setSqlQuery("")} disabled={!sqlQuery}>
              Clear
            </button>
          </div>
        </div>

        {/* Query History */}
        {queryHistory.length > 0 && (
          <div className="query-history">
            <h3>Query History</h3>
            <ul>
              {queryHistory.map((query, index) => (
                <li key={index} onClick={() => loadQueryFromHistory(query)}>
                  {query.length > 50 ? query.substring(0, 50) + "..." : query}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Results Display Module */}
      <section className="module results-module">
        <h2>Results</h2>
        {error ? (
          <div className="error-message">{error}</div>
        ) : queryResult ? (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {queryResult.columns.map((column, index) => (
                    <th key={index}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="results-info">
              {queryResult.rows.length} rows returned
            </div>
          </div>
        ) : (
          <p>Run a query to see results here.</p>
        )}
      </section>
    </div>
  );
};

export default DatabaseViewer;