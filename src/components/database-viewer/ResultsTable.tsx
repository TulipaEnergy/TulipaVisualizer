import {
  Paper,
  Text,
  ScrollArea,
  Table,
  Alert,
  Stack,
  Title,
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
  return (
    <Paper p="md" radius="md" withBorder shadow="sm">
      {result && (
        <Title order={5} mb="md">
          Results from {dbFile}
        </Title>
      )}

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
      ) : result ? (
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
                {result.rows.map((row, rowIndex) => (
                  <Table.Tr key={rowIndex}>
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
          <Text size="sm" c="dimmed" ta="right">
            {result.rows.length} rows returned
          </Text>
        </Stack>
      ) : (
        <Text c="dimmed">Run a query to see results here.</Text>
      )}
    </Paper>
  );
};
