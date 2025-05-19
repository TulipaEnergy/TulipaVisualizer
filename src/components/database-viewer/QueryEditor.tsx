import {
  Paper,
  Text,
  Textarea,
  Button,
  Group,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useState } from "react";

interface QueryEditorProps {
  sqlQuery: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const QueryEditor = ({
  sqlQuery,
  onQueryChange,
  onExecute,
  isLoading,
  isDisabled,
}: QueryEditorProps) => {
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const handleExecute = () => {
    if (sqlQuery.trim()) {
      onExecute();
      // Add to history if not already the latest
      if (queryHistory.length === 0 || queryHistory[0] !== sqlQuery) {
        setQueryHistory((prev) => [sqlQuery, ...prev.slice(0, 9)]);
      }
    }
  };

  const loadQueryFromHistory = (query: string) => {
    onQueryChange(query);
  };

  return (
    <Paper p="md" radius="md" withBorder shadow="sm" h="100%">
      <Stack h="100%">
        <Text fw={500} size="lg">
          SQL Query
        </Text>

        <Textarea
          value={sqlQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Enter your SQL query here..."
          minRows={5}
          autosize
          maxRows={10}
        />

        <Group>
          <Button
            onClick={handleExecute}
            loading={isLoading}
            disabled={isDisabled || !sqlQuery.trim()}
          >
            {isLoading ? "Executing..." : "Run Query"}
          </Button>
          <Button
            variant="light"
            color="red"
            onClick={() => onQueryChange("")}
            disabled={!sqlQuery}
          >
            Clear
          </Button>
        </Group>

        {queryHistory.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Query History
            </Text>
            <ScrollArea h={150}>
              {queryHistory.map((query, index) => (
                <Text
                  key={index}
                  size="sm"
                  style={{
                    cursor: "pointer",
                    padding: "8px",
                    borderBottom: "1px solid var(--mantine-color-gray-3)",
                    "&:hover": {
                      backgroundColor: "var(--mantine-color-gray-0)",
                    },
                  }}
                  onClick={() => loadQueryFromHistory(query)}
                  truncate
                >
                  {query}
                </Text>
              ))}
            </ScrollArea>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};
