import { useState, useEffect } from "react";
import "./DatabaseViewer.css";
import useVisualizationStore from "../store/visualizationStore";
import { run_query } from "../debugtools/generalQuery";

interface QueryResult {
  columns: string[];
  rows: any[][];
}

const DatabaseViewer = () => {
  const {
    dbFilePath,
    tables,
    selectedTable,
    setSelectedTable,
    isLoading: storeIsLoading,
  } = useVisualizationStore();

  // Local loading state for query operations
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Query state
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Results state
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update query when a table is selected
  useEffect(() => {
    if (selectedTable) {
      const query = `SELECT * FROM ${selectedTable} LIMIT 100;`;
      setSqlQuery(query);
    }
  }, [selectedTable]);

  // Execute SQL query with the current SQL text in state
  async function executeQuery() {
    executeQueryWithText(sqlQuery);
  }

  // Execute SQL query with provided text
  async function executeQueryWithText(query: string) {
    if (!query.trim()) {
      setError("Query cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      // Use the run_query utility from dbConn.ts
      const table = await run_query(query);

      // Extract column names from table schema
      const columns = table.schema.fields.map((field) => field.name);

      // Extract rows from table
      const rows: any[][] = [];
      for (let i = 0; i < table.numRows; i++) {
        const row = table.get(i);
        if (row) {
          const rowData = columns.map((col) => row[col]);
          rows.push(rowData);
        }
      }

      setQueryResult({ columns, rows });

      // Add query to history if it's not already the latest
      if (queryHistory.length === 0 || queryHistory[0] !== query) {
        setQueryHistory((prev) => [query, ...prev.slice(0, 9)]);
      }

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

  // Show table schema when requested
  const showTableSchema = (tableName: string) => {
    const query = `PRAGMA table_info('${tableName}');`;
    setSqlQuery(query);
    executeQueryWithText(query);
  };

  return (
    <div className="database-viewer">
      {/* Database Connection Info */}
      <section className="module file-upload-module">
        <h2>Database Connection</h2>
        <div className="file-selection">
          {dbFilePath ? (
            <p className="selected-file">File: {dbFilePath}</p>
          ) : (
            <p className="no-file-message">
              No database file loaded. Please load a file from the toolbar.
            </p>
          )}
        </div>
      </section>

      {/* Tables Preview Module */}
      <section className="module tables-preview-module">
        <h2>Tables</h2>
        {tables.length > 0 ? (
          <div className="tables-list">
            {tables.map((tableName) => (
              <div
                key={tableName}
                className={`table-item ${selectedTable === tableName ? "selected" : ""}`}
              >
                <span onClick={() => handleTableSelect(tableName)}>
                  {tableName}
                </span>
                <button
                  className="schema-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showTableSchema(tableName);
                  }}
                  title="Show schema"
                >
                  ℹ️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>
            No tables found. Please select a valid DuckDB file from the toolbar.
          </p>
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
            <button
              onClick={executeQuery}
              disabled={isLoading || storeIsLoading || !dbFilePath}
            >
              {isLoading || storeIsLoading ? "Executing..." : "Run Query"}
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
        ) : isLoading || storeIsLoading ? (
          <div className="loading-message">Loading results...</div>
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
                      <td key={cellIndex}>
                        {String(cell !== null ? cell : "NULL")}
                      </td>
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
