import React, { useState, useEffect } from "react";
import {
  Modal,
  Text,
  Title,
  ScrollArea,
  Button,
  Group,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { IconBook, IconInfoCircle } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css"; // You can change this to other highlight.js themes
import { readString } from "../gateway/io";

interface DocumentationModalProps {
  opened: boolean;
  onClose: () => void;
}

const USER_DOC_PATH = "assets/docs/user-guide.md"

const DocumentationModal: React.FC<DocumentationModalProps> = ({
  opened,
  onClose,
}) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocContent = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("READ:")
      const content = await readString(USER_DOC_PATH)
      setContent(content);
    } catch (err) {
      console.error("Error loading documentation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load documentation",
      );

      setContent(`Error loading file at ${USER_DOC_PATH}. Please reach out to the developers.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      loadDocContent();
    }
  }, [opened]);


  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconBook size={20} />
          <Title order={3}>User Documentation</Title>
        </Group>
      }
      size="xl"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        body: { padding: 0 },
        content: { marginTop: "30px" },
      }}
      yOffset="80px" 
    >
      <div style={{ position: "relative", minHeight: "60vh", padding:"0 50px" }}>
        <LoadingOverlay visible={loading} />

          {error && (
            <Alert
              icon={<IconInfoCircle size={16} />}
              title="Loading Information"
              color="blue"
              mb="md"
            >
              {error}
            </Alert>
          )}

          <div
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "var(--mantine-color-text)",
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => (
                  <Title
                    order={1}
                    mb="md"
                    mt="xl"
                    style={{
                      borderBottom: "2px solid #e9ecef",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    {children}
                  </Title>
                ),
                h2: ({ children }) => (
                  <Title
                    order={2}
                    mb="sm"
                    mt="lg"
                    style={{ color: "var(--mantine-primary-color-6)" }}
                  >
                    {children}
                  </Title>
                ),
                h3: ({ children }) => (
                  <Title order={3} mb="sm" mt="md">
                    {children}
                  </Title>
                ),
                h4: ({ children }) => (
                  <Title order={4} mb="xs" mt="md">
                    {children}
                  </Title>
                ),
                p: ({ children }) => (
                  <Text mb="sm" style={{ textAlign: "justify" }}>
                    {children}
                  </Text>
                ),
                ul: ({ children }) => (
                  <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: "0.25rem" }}>{children}</li>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      style={{
                        backgroundColor: "var(--mantine-color-gray-1)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "3px",
                        fontSize: "0.9em",
                        fontFamily: "var(--mantine-font-family-monospace)",
                      }}
                    >
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre
                    style={{
                      backgroundColor: "var(--mantine-color-gray-0)",
                      padding: "1rem",
                      borderRadius: "6px",
                      overflow: "auto",
                      marginBottom: "1rem",
                      border: "1px solid var(--mantine-color-gray-3)",
                    }}
                  >
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    style={{
                      borderLeft: "4px solid var(--mantine-primary-color-4)",
                      paddingLeft: "1rem",
                      marginLeft: 0,
                      marginBottom: "1rem",
                      fontStyle: "italic",
                      backgroundColor: "var(--mantine-color-gray-0)",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid var(--mantine-color-gray-3)",
                      }}
                    >
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    style={{
                      border: "1px solid var(--mantine-color-gray-3)",
                      padding: "0.5rem",
                      backgroundColor: "var(--mantine-color-gray-1)",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    style={{
                      border: "1px solid var(--mantine-color-gray-3)",
                      padding: "0.5rem",
                    }}
                  >
                    {children}
                  </td>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    style={{
                      color: "var(--mantine-primary-color-6)",
                      textDecoration: "none",
                      borderBottom: "1px solid transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderBottomColor =
                        "var(--mantine-primary-color-6)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderBottomColor = "transparent")
                    }
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

        <div
          style={{
            padding: "1rem",
            borderTop: "1px solid #e9ecef",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button onClick={onClose} variant="filled">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentationModal;
