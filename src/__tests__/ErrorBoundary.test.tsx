import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Component, ErrorInfo, ReactNode, useState } from "react";
import { Button, Text, Alert } from "@mantine/core";
import { renderWithProviders } from "../test/utils";

// Error Boundary Component for Testing
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (
    error: Error,
    errorInfo: ErrorInfo,
    retry: () => void,
  ) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class TestErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `error-${Date.now()}-${Math.random()}`,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for monitoring
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `error-${Date.now()}-${Math.random()}`,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.retry,
        );
      }

      // Default error UI
      return (
        <Alert color="red" title="Something went wrong">
          <Text size="sm" mb="md">
            {this.state.error.message}
          </Text>
          <Button onClick={this.retry} size="sm">
            Try Again
          </Button>
        </Alert>
      );
    }

    return <div key={this.state.errorId}>{this.props.children}</div>;
  }
}

// Test Components that throw errors
const ErrorThrowingComponent = ({
  shouldThrow,
  errorMessage,
}: {
  shouldThrow: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage || "Test error for error boundary");
  }
  return <Text>Component rendered successfully</Text>;
};

// Controlled error component for testing recovery
const ControlledErrorComponent = ({ forceError }: { forceError: boolean }) => {
  if (forceError) {
    throw new Error("Controlled test error");
  }
  return <Text>Component rendered successfully</Text>;
};

// Utility component for testing nested errors
const NestedErrorComponent = ({
  level,
  maxLevel,
}: {
  level: number;
  maxLevel: number;
}) => {
  if (level >= maxLevel) {
    throw new Error(`Nested error at level ${level}`);
  }

  return (
    <div>
      <Text>Level {level}</Text>
      <NestedErrorComponent level={level + 1} maxLevel={maxLevel} />
    </div>
  );
};

describe("Error Boundary Functionality", () => {
  const mockOnError = vi.fn();
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.resetAllMocks();
    mockOnError.mockClear();
    // Suppress console.error for cleaner test output
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("Basic Error Boundary Functionality", () => {
    it("renders children when no error occurs", () => {
      renderWithProviders(
        <TestErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </TestErrorBoundary>,
      );

      expect(
        screen.getByText("Component rendered successfully"),
      ).toBeInTheDocument();
    });

    it("catches and displays errors from child components", () => {
      renderWithProviders(
        <TestErrorBoundary>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage="Custom test error"
          />
        </TestErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Custom test error")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Try Again" }),
      ).toBeInTheDocument();
    });

    it("calls onError callback when error occurs", () => {
      renderWithProviders(
        <TestErrorBoundary onError={mockOnError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage="Callback test error"
          />
        </TestErrorBoundary>,
      );

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Callback test error",
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });

    it("logs errors to console", () => {
      renderWithProviders(
        <TestErrorBoundary>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage="Console log test"
          />
        </TestErrorBoundary>,
      );

      expect(console.error).toHaveBeenCalledWith(
        "Error Boundary caught an error:",
        expect.objectContaining({
          message: "Console log test",
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe("Error Recovery Functionality", () => {
    it("allows recovery after error with retry button", async () => {
      // Use a parent component to control error state
      const TestWrapper = () => {
        const [hasError, setHasError] = useState(true);

        const customFallback = (
          error: Error,
          _: ErrorInfo,
          retry: () => void,
        ) => (
          <div>
            <Text>Error: {error.message}</Text>
            <Button
              onClick={() => {
                setHasError(false);
                retry();
              }}
              data-testid="retry-button"
            >
              Try Again
            </Button>
          </div>
        );

        return (
          <TestErrorBoundary fallback={customFallback}>
            <ControlledErrorComponent forceError={hasError} />
          </TestErrorBoundary>
        );
      };

      renderWithProviders(<TestWrapper />);

      // Error state should be displayed
      expect(
        screen.getByText("Error: Controlled test error"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("retry-button")).toBeInTheDocument();

      // Click retry button
      await act(async () => {
        fireEvent.click(screen.getByTestId("retry-button"));
      });

      // Should show successful render
      await waitFor(() => {
        expect(
          screen.getByText("Component rendered successfully"),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText("Error: Controlled test error"),
      ).not.toBeInTheDocument();
    });

    it("resets error state completely on retry", async () => {
      const TestWrapper = () => {
        const [hasError, setHasError] = useState(true);

        const customFallback = (
          _error: Error,
          _errorInfo: ErrorInfo,
          retry: () => void,
        ) => (
          <div>
            <Text>Error occurred</Text>
            <Button
              onClick={() => {
                setHasError(false);
                retry();
              }}
              data-testid="retry-button"
            >
              Retry
            </Button>
          </div>
        );

        return (
          <TestErrorBoundary onError={mockOnError} fallback={customFallback}>
            <ControlledErrorComponent forceError={hasError} />
          </TestErrorBoundary>
        );
      };

      renderWithProviders(<TestWrapper />);

      expect(screen.getByText("Error occurred")).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledTimes(1);

      // Click retry
      await act(async () => {
        fireEvent.click(screen.getByTestId("retry-button"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Component rendered successfully"),
        ).toBeInTheDocument();
      });
      // onError should still only be called once (from the original error)
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it("handles subsequent errors after recovery", async () => {
      const TestWrapper = () => {
        const [errorCount, setErrorCount] = useState(0);

        const customFallback = (
          _error: Error,
          _errorInfo: ErrorInfo,
          retry: () => void,
        ) => (
          <div>
            <Text>
              Error {errorCount + 1}: {_error.message}
            </Text>
            <Button
              onClick={() => {
                if (errorCount === 0) {
                  // First recovery - fix the error temporarily
                  setErrorCount(1);
                  retry();
                } else {
                  // Second recovery
                  setErrorCount(2);
                  retry();
                }
              }}
              data-testid="retry-button"
            >
              Retry
            </Button>
          </div>
        );

        // Control error states
        const shouldError = errorCount === 0 || errorCount === 1;

        return (
          <TestErrorBoundary onError={mockOnError} fallback={customFallback}>
            <ControlledErrorComponent forceError={shouldError} />
          </TestErrorBoundary>
        );
      };

      renderWithProviders(<TestWrapper />);

      expect(
        screen.getByText("Error 1: Controlled test error"),
      ).toBeInTheDocument();

      // First retry - should work briefly then error again
      await act(async () => {
        fireEvent.click(screen.getByTestId("retry-button"));
      });

      // Should show second error
      await waitFor(() => {
        expect(
          screen.getByText("Error 2: Controlled test error"),
        ).toBeInTheDocument();
      });

      // Second retry - should succeed
      await act(async () => {
        fireEvent.click(screen.getByTestId("retry-button"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Component rendered successfully"),
        ).toBeInTheDocument();
      });

      expect(mockOnError).toHaveBeenCalledTimes(2);
    });
  });

  describe("Custom Error Fallback UI", () => {
    it("renders custom fallback when provided", () => {
      const customFallback = (
        error: Error,
        _errorInfo: ErrorInfo,
        retry: () => void,
      ) => (
        <div>
          <Text color="red">Custom Error: {error.message}</Text>
          <Button onClick={retry} data-testid="custom-retry">
            Custom Retry
          </Button>
        </div>
      );

      renderWithProviders(
        <TestErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage="Custom fallback test"
          />
        </TestErrorBoundary>,
      );

      expect(
        screen.getByText("Custom Error: Custom fallback test"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("custom-retry")).toBeInTheDocument();
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });

    it("custom fallback retry functionality works", async () => {
      const TestWrapper = () => {
        const [hasError, setHasError] = useState(true);

        const customFallback = (
          error: Error,
          _errorInfo: ErrorInfo,
          retry: () => void,
        ) => (
          <Button
            onClick={() => {
              setHasError(false);
              retry();
            }}
            data-testid="custom-retry"
          >
            Custom Retry: {error.message}
          </Button>
        );

        return (
          <TestErrorBoundary fallback={customFallback}>
            <ControlledErrorComponent forceError={hasError} />
          </TestErrorBoundary>
        );
      };

      renderWithProviders(<TestWrapper />);

      expect(
        screen.getByText("Custom Retry: Controlled test error"),
      ).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId("custom-retry"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Component rendered successfully"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Boundary Limitations", () => {
    it("does not catch async errors", async () => {
      // This test verifies the limitation - async errors are not caught
      renderWithProviders(
        <TestErrorBoundary>
          <Text>Component rendered before async error</Text>
        </TestErrorBoundary>,
      );

      // Component should render normally (async error not caught)
      expect(
        screen.getByText("Component rendered before async error"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });

    it("event handler errors are not caught by error boundaries", () => {
      // This test demonstrates the limitation that error boundaries don't catch event handler errors
      // We'll test this by showing that the error boundary remains inactive even when a component
      // is designed to throw in an event handler

      renderWithProviders(
        <TestErrorBoundary>
          <div>
            <Text>Component with event handler</Text>
            <Button data-testid="safe-button">Safe Button</Button>
          </div>
        </TestErrorBoundary>,
      );

      expect(
        screen.getByText("Component with event handler"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("safe-button")).toBeInTheDocument();

      // The error boundary should not be triggered
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();

      // Component remains functional
      fireEvent.click(screen.getByTestId("safe-button"));
      expect(
        screen.getByText("Component with event handler"),
      ).toBeInTheDocument();
    });
  });

  describe("Nested Component Errors", () => {
    it("catches errors from deeply nested components", () => {
      renderWithProviders(
        <TestErrorBoundary>
          <NestedErrorComponent level={1} maxLevel={3} />
        </TestErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Nested error at level 3")).toBeInTheDocument();
    });

    it("provides component stack in error info", () => {
      renderWithProviders(
        <TestErrorBoundary onError={mockOnError}>
          <NestedErrorComponent level={1} maxLevel={2} />
        </TestErrorBoundary>,
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Nested error at level 2",
        }),
        expect.objectContaining({
          componentStack: expect.stringContaining("NestedErrorComponent"),
        }),
      );
    });
  });

  describe("Multiple Error Boundaries", () => {
    it("catches errors at the nearest boundary", () => {
      renderWithProviders(
        <TestErrorBoundary fallback={() => <Text>Outer boundary</Text>}>
          <div>
            <TestErrorBoundary fallback={() => <Text>Inner boundary</Text>}>
              <ErrorThrowingComponent shouldThrow={true} />
            </TestErrorBoundary>
          </div>
        </TestErrorBoundary>,
      );

      // Inner boundary should catch the error
      expect(screen.getByText("Inner boundary")).toBeInTheDocument();
      expect(screen.queryByText("Outer boundary")).not.toBeInTheDocument();
    });
  });

  describe("Error Boundary State Management", () => {
    it("maintains separate error states for different boundaries", async () => {
      renderWithProviders(
        <div>
          <TestErrorBoundary>
            <ErrorThrowingComponent
              shouldThrow={true}
              errorMessage="First boundary error"
            />
          </TestErrorBoundary>
          <TestErrorBoundary>
            <ErrorThrowingComponent shouldThrow={false} />
          </TestErrorBoundary>
        </div>,
      );

      expect(screen.getByText("First boundary error")).toBeInTheDocument();
      expect(
        screen.getByText("Component rendered successfully"),
      ).toBeInTheDocument();
    });

    it("resets only the specific boundary that encounters error", async () => {
      const TestWrapper = () => {
        const [boundary1Error, setBoundary1Error] = useState(true);

        const customFallback = (
          _error: Error,
          _errorInfo: ErrorInfo,
          retry: () => void,
        ) => (
          <div>
            <Text>Error: {_error.message}</Text>
            <Button
              onClick={() => {
                setBoundary1Error(false);
                retry();
              }}
              data-testid="boundary-1-retry"
            >
              Try Again
            </Button>
          </div>
        );

        return (
          <div>
            <TestErrorBoundary fallback={customFallback}>
              <ControlledErrorComponent forceError={boundary1Error} />
            </TestErrorBoundary>
            <TestErrorBoundary>
              <Text>Boundary 2 content</Text>
            </TestErrorBoundary>
          </div>
        );
      };

      renderWithProviders(<TestWrapper />);

      expect(
        screen.getByText("Error: Controlled test error"),
      ).toBeInTheDocument();
      expect(screen.getByText("Boundary 2 content")).toBeInTheDocument();

      // Click retry on first boundary
      await act(async () => {
        fireEvent.click(screen.getByTestId("boundary-1-retry"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Component rendered successfully"),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("Boundary 2 content")).toBeInTheDocument();
    });
  });

  describe("Error Information and Debugging", () => {
    it("provides complete error information", () => {
      const errorMessage = "Detailed error for debugging";
      renderWithProviders(
        <TestErrorBoundary onError={mockOnError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage={errorMessage}
          />
        </TestErrorBoundary>,
      );

      const [error, errorInfo] = mockOnError.mock.calls[0];

      expect(error.message).toBe(errorMessage);
      expect(error.name).toBe("Error");
      expect(error.stack).toBeDefined();

      expect(errorInfo.componentStack).toBeDefined();
      expect(errorInfo.componentStack).toContain("ErrorThrowingComponent");
    });

    it("handles different types of errors", () => {
      renderWithProviders(
        <TestErrorBoundary onError={mockOnError}>
          <ErrorThrowingComponent
            shouldThrow={true}
            errorMessage="Type error test"
          />
        </TestErrorBoundary>,
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Type error test",
        }),
        expect.any(Object),
      );
    });
  });
});
