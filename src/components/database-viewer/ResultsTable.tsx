import { useState, useEffect } from "react";
import {
  Paper,
  Text,
  ScrollArea,
  Table,
  Alert,
  Stack,
  Title,
  Group,
  Pagination,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface QueryResult {
  columns: string[];
  rows: any[][];
}

interface ResultsTableProps {
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
  dbFile: string;
}

export const ResultsTable = ({
  result,
  isLoading,
  error,
  dbFile,
}: ResultsTableProps) => {
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);

  // make sure the page doesn't get stuck to a page higher than is available
  useEffect(() => {
    setPage(1);
  }, [result, dbFile]);

  if (!result) {
    // Check for null before using it in the below variables
    return (
      <Paper p="md" radius="md" withBorder shadow="sm">
        {error ? (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="filled"
          >
            {error}
          </Alert>
        ) : isLoading ? (
          <Text c="dimmed">Loading results...</Text>
        ) : (
          <Text c="dimmed">Run a query to see results here.</Text>
        )}
      </Paper>
    );
  }

  const totalRows = result.rows.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);
  const displayedRows = result.rows.slice(startIndex, endIndex);

  return (
    <Paper p="md" radius="md" withBorder shadow="sm">
      <Title order={5} mb="md">
        Results from {dbFile}
      </Title>

      {error ? (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="filled"
        >
          {error}
        </Alert>
      ) : isLoading ? (
        <Text c="dimmed">Loading results...</Text>
      ) : (
        <Stack>
          <ScrollArea h={400} type="always">
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  {result.columns.map((column, index) => (
                    <Table.Th key={index}>{column}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {displayedRows.map((row, rowIndex) => (
                  <Table.Tr key={rowIndex + startIndex}>
                    {row.map((cell, cellIndex) => (
                      <Table.Td key={cellIndex}>
                        {String(cell !== null ? cell : "NULL")}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="apart" align="center">
            <Text size="sm" c="dimmed">
              Showing {startIndex + 1}–{endIndex} of {totalRows} rows
            </Text>
            <Pagination value={page} onChange={setPage} total={totalPages} />
          </Group>
        </Stack>
      )}
    </Paper>
  );
};
