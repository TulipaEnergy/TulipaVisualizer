import React, { useState, useEffect } from 'react';
import { Modal, Text, Title, ScrollArea, Button, Group, Select, LoadingOverlay, Alert } from '@mantine/core';
import { IconBook, IconInfoCircle } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // You can change this to other highlight.js themes

interface DocumentationModalProps {
  opened: boolean;
  onClose: () => void;
}

interface DocFile {
  name: string;
  path: string;
  label: string;
}

const DOC_FILES: DocFile[] = [
  { name: 'user-guide', path: '/docs/user-guide.md', label: 'User Guide' },
  { name: 'api-reference', path: '/docs/api-reference.md', label: 'API Reference' },
  { name: 'developer-guide-frontend', path: '/docs/developer-guide-frontend.md', label: 'Frontend Developer Guide' },
  { name: 'developer-guide-backend', path: '/docs/developer-guide-backend.md', label: 'Backend Developer Guide' },
  { name: 'testing', path: '/docs/Testing.md', label: 'Testing Guide' },
  { name: 'readme', path: '/README.md', label: 'Project Overview' },
];

const DocumentationModal: React.FC<DocumentationModalProps> = ({ opened, onClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string>('user-guide');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocContent = async (docName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const docFile = DOC_FILES.find(doc => doc.name === docName);
      if (!docFile) {
        throw new Error('Documentation file not found');
      }

      // In a Tauri app, we need to read files from the file system
      // For now, we'll use a placeholder implementation
      // You may need to implement a Tauri command to read local files
      const response = await fetch(docFile.path);
      if (!response.ok) {
        throw new Error(`Failed to load documentation: ${response.statusText}`);
      }
      
      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error('Error loading documentation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documentation');
      // Fallback content for demonstration
      setContent(`# ${DOC_FILES.find(doc => doc.name === docName)?.label || 'Documentation'}

Sorry, the documentation file could not be loaded from the local repository.

This is a placeholder content. In a production environment, you would implement a Tauri command to read local markdown files from the repository.

## Features Available

- Interactive markdown rendering
- Syntax highlighting
- GitHub-flavored markdown support
- Multiple documentation sections
- Responsive modal layout

## Implementation Notes

To fully implement this feature, you would need to:

1. Create a Tauri command in the backend to read local files
2. Update the frontend to call this command
3. Handle file reading permissions appropriately

For now, this demonstrates the UI structure and markdown rendering capabilities.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened && selectedDoc) {
      loadDocContent(selectedDoc);
    }
  }, [opened, selectedDoc]);

  const handleDocChange = (value: string | null) => {
    if (value) {
      setSelectedDoc(value);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconBook size={20} />
          <Title order={3}>Documentation</Title>
        </Group>
      }
      size="xl"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        body: { padding: 0 },
        content: { maxHeight: '90vh' }
      }}
    >
      <div style={{ position: 'relative', minHeight: '60vh' }}>
        <LoadingOverlay visible={loading} />
        
        {/* Document Selector */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e9ecef' }}>
          <Select
            label="Select Documentation"
            placeholder="Choose a documentation section"
            value={selectedDoc}
            onChange={handleDocChange}
            data={DOC_FILES.map(doc => ({
              value: doc.name,
              label: doc.label
            }))}
            comboboxProps={{ withinPortal: false }}
          />
        </div>

        {/* Content Area */}
        <ScrollArea h="calc(90vh - 120px)" p="md">
          {error && (
            <Alert 
              icon={<IconInfoCircle size={16} />}
              title="Loading Error"
              color="yellow"
              mb="md"
            >
              {error}
            </Alert>
          )}
          
          <div style={{ 
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'var(--mantine-color-text)'
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => (
                  <Title order={1} mb="md" mt="xl" style={{ borderBottom: '2px solid #e9ecef', paddingBottom: '0.5rem' }}>
                    {children}
                  </Title>
                ),
                h2: ({ children }) => (
                  <Title order={2} mb="sm" mt="lg" style={{ color: 'var(--mantine-primary-color-6)' }}>
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
                  <Text mb="sm" style={{ textAlign: 'justify' }}>
                    {children}
                  </Text>
                ),
                ul: ({ children }) => (
                  <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: '0.25rem' }}>
                    {children}
                  </li>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code style={{
                      backgroundColor: 'var(--mantine-color-gray-1)',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '3px',
                      fontSize: '0.9em',
                      fontFamily: 'var(--mantine-font-family-monospace)'
                    }}>
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                pre: ({ children }) => (
                  <pre style={{
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    padding: '1rem',
                    borderRadius: '6px',
                    overflow: 'auto',
                    marginBottom: '1rem',
                    border: '1px solid var(--mantine-color-gray-3)'
                  }}>
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{
                    borderLeft: '4px solid var(--mantine-primary-color-4)',
                    paddingLeft: '1rem',
                    marginLeft: 0,
                    marginBottom: '1rem',
                    fontStyle: 'italic',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    padding: '0.5rem 1rem'
                  }}>
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid var(--mantine-color-gray-3)'
                    }}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    padding: '0.5rem',
                    backgroundColor: 'var(--mantine-color-gray-1)',
                    textAlign: 'left',
                    fontWeight: 600
                  }}>
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    padding: '0.5rem'
                  }}>
                    {children}
                  </td>
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div style={{ 
          padding: '1rem', 
          borderTop: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <Button onClick={onClose} variant="filled">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentationModal; 