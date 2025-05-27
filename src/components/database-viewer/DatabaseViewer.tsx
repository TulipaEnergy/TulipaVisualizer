import { Grid, Container } from "@mantine/core";
import { useState, useEffect } from "react";
import useVisualizationStore from "../../store/visualizationStore";
import {
  executeCustomQuery,
  fetchDatabaseTables,
} from "../../services/databaseOperations";
import { TablesList } from "./TablesList";
import { QueryEditor } from "./QueryEditor";
import { ResultsTable } from "./ResultsTable";

interface QueryResult {
  columns: string[];
  rows: any[][];
}

const DatabaseViewer = () => {
  const { globalDBFilePath, isLoading: storeIsLoading } =
    useVisualizationStore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("queryHistory");
    return saved ? JSON.parse(saved) : [];
  });

  // Execute SQL query
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      setError("Query cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      const table = await executeCustomQuery(sqlQuery);

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
      setError(null);
    } catch (error: any) {
      setError(`Query error: ${error.message || error}`);
      console.error("Query error details:", error);
      setQueryResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setSqlQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
  };

  // Show table schema
  const showTableSchema = (tableName: string) => {
    const query = `PRAGMA table_info('${tableName}');`;
    setSqlQuery(query);
    executeQuery();
  };

  // Fetch database tables when component mounts
  useEffect(() => {
    if (globalDBFilePath) {
      fetchDatabaseTables()
        .then(({ tables }) => {
          setTables(tables);
        })
        .catch((error) => {
          console.error("Error fetching database tables:", error);
          setError("Failed to fetch database tables");
        });
    }
  }, [globalDBFilePath]);

  // Persist queryHistory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("queryHistory", JSON.stringify(queryHistory));
  }, [queryHistory]);

  return (
    <Container size="xl" h="100%">
      <Grid h="100%" gutter="md">
        <Grid.Col span={3}>
          <TablesList
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={handleTableSelect}
            onShowSchema={showTableSchema}
          />
        </Grid.Col>

        <Grid.Col span={9}>
          <QueryEditor
            sqlQuery={sqlQuery}
            onQueryChange={setSqlQuery}
            onExecute={executeQuery}
            isLoading={isLoading || storeIsLoading}
            isDisabled={!globalDBFilePath}
            queryHistory={queryHistory}
            setQueryHistory={setQueryHistory}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <ResultsTable
            dbFile={globalDBFilePath ?? "unknown file how did you do this"}
            result={queryResult}
            isLoading={isLoading || storeIsLoading}
            error={error}
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default DatabaseViewer;
