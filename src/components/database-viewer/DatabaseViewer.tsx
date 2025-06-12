import { Grid, Container } from "@mantine/core";
import { useState, useEffect } from "react";
import useVisualizationStore from "../../store/visualizationStore";
import { TablesList } from "./TablesList";
import { QueryEditor } from "./QueryEditor";
import { ResultsTable } from "./ResultsTable";
import { runCustomQuery } from "../../services/databaseOperations";
import { getTables } from "../../services/metadata";

interface QueryResult {
  columns: string[];
  rows: any[][];
}

interface DatabaseViewerProps {
  graphId: string;
}

const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ graphId }) => {
  const {
    isLoading: storeIsLoading,
    getGraphDatabase,
    updateGraph,
  } = useVisualizationStore();
  const dbFilePath = getGraphDatabase(graphId)!;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("queryHistory");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn("Failed to parse query history from localStorage:", error);
      return [];
    }
  });

  // Execute SQL query
  const executeQuery = async (sql: string = sqlQuery) => {
    if (!sql.trim()) {
      setError("Query cannot be empty");
      setQueryResult(null); // Clear any previous results
      return;
    }

    setError(null); // Clear any previous errors
    setQueryResult(null); // Clear previous results

    try {
      setIsLoading(true);
      const table = await runCustomQuery(dbFilePath, sql);

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
    setSqlQuery(`SELECT * FROM ${tableName};`);
    setError(null); // Clear any previous errors
  };

  const showTableSchema = async (tableName: string) => {
    const query = `PRAGMA table_info('${tableName}');`;
    setSqlQuery(query);
    setError(null); // Clear any previous errors
    await executeQuery(query);
  };

  useEffect(() => {
    updateGraph(graphId, { title: "DuckDB query explorer" });
  }, []);

  // update tables whenever the db file is changed
  useEffect(() => {
    getTables(dbFilePath)
      .then((tables: string[]) => {
        setTables(tables);
      })
      .catch((error) => {
        console.error("Error fetching database tables:", error);
        setError("Failed to fetch database tables");
      });

    if (sqlQuery) {
      executeQuery();
    }
  }, [dbFilePath]);

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
            isDisabled={false} // any case when this should be true?
            queryHistory={queryHistory}
            setQueryHistory={setQueryHistory}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <ResultsTable
            dbFile={dbFilePath}
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
