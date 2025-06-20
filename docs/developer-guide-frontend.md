# Frontend Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Component Patterns](#component-patterns)
5. [State Management](#state-management)
6. [Service Layer](#service-layer)
7. [Testing Strategy](#testing-strategy)
8. [Performance Guidelines](#performance-guidelines)

## Architecture Overview

### Technology Stack
- **React 18**: Functional components with hooks pattern
- **TypeScript**: Strict typing with comprehensive coverage
- **Vite**: Build tool and development server
- **Mantine UI**: Component library with theming
- **Apache ECharts**: Data visualization
- **Zustand**: Lightweight state management
- **Tauri**: Desktop app framework with IPC

### Design Principles
- **Type Safety**: Comprehensive TypeScript usage
- **Component Composition**: Reusable, single-purpose components
- **Performance First**: Optimized rendering with proper memoization
- **Testability**: Components designed for easy testing
- **Separation of Concerns**: Clear UI/state/service boundaries

### Data Flow Architecture
```
User Input → Component → Store Action → Service → IPC Gateway → Rust Backend
     ↑                                                                ↓
UI Update ← Component Update ← Store Update ← Service Response ← Database Query
```

## Development Setup

### Prerequisites
- **Node.js**: 18+ LTS
- **npm**: 9+
- **Rust**: 1.70+ (for full-stack development)
- **VS Code**: Recommended IDE

### Quick Start
```bash
# Clone and install
git clone <repository-url>
cd energy-visualizer
npm install

# Development commands
npm run dev          # Frontend only
npm run tauri dev    # Full application
npm run build        # Production build
npm run test         # Run test suite
```

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "tauri-apps.tauri-vscode",
    "vitest.explorer"
  ]
}
```

## Project Structure

```
src/
├── components/              # React components
│   ├── __tests__/          # Component tests
│   ├── database-viewer/    # Database exploration
│   ├── kpis/               # Chart components
│   ├── metadata/           # Filtering components
│   ├── DatabaseList.tsx    # File management
│   ├── DatabaseSelector.tsx# Database picker
│   ├── GraphCard.tsx       # Main chart container
│   └── Toolbar.tsx         # App header
├── gateway/                # IPC communication
│   ├── db.ts              # Database operations
│   └── io.ts              # File system access
├── hooks/                  # Custom React hooks
├── services/               # Business logic layer
├── store/                  # Zustand state management
├── types/                  # TypeScript definitions
└── test/                   # Test utilities
```

### File Naming Conventions
- **Components**: PascalCase (`GraphCard.tsx`)
- **Hooks**: camelCase with "use" prefix (`useResizeHandle.ts`)
- **Services**: camelCase (`capacityQuery.ts`)
- **Tests**: Component name + `.test.tsx`

## Component Patterns

### Component Interface Pattern
```typescript
interface ComponentProps {
  /** Required prop with clear documentation */
  graphId: string;
  /** Optional prop with default */
  isLoading?: boolean;
  /** Event handler */
  onDataChange?: (data: DataType) => void;
}

const Component: React.FC<ComponentProps> = ({
  graphId,
  isLoading = false,
  onDataChange
}) => {
  // Component implementation
};
```

### Container vs Presentation Components

**Container Components** (e.g., `GraphCard.tsx`):
- Manage state and data fetching
- Handle business logic
- Connect to stores and services

**Presentation Components** (e.g., chart components):
- Pure UI rendering
- Minimal internal state
- Receive data via props

### Error Handling Pattern
```typescript
const Component: React.FC<Props> = ({ graphId }) => {
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await serviceCall(graphId);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Component error:', err);
      }
    };

    fetchData();
  }, [graphId]);

  if (error) {
    return <Text c="red">{error}</Text>;
  }

  return data ? <DataVisualization data={data} /> : <Loader />;
};
```

## State Management

### Zustand Store Pattern
The application uses a single Zustand store (`visualizationStore.ts`) with typed interfaces:

```typescript
export interface VisualizationState {
  // Database management
  databases: string[];
  isLoading: boolean;
  error: string | null;
  
  // Graph management
  graphs: GraphConfig[];
  
  // Actions
  addDatabase: (filePath: string) => void;
  removeDatabase: (dbId: string) => void;
  addGraph: (type: ChartType) => void;
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;
}
```

### Store Usage in Components
```typescript
const Component: React.FC = () => {
  const { databases, addDatabase, isLoading } = useVisualizationStore();
  
  const handleUpload = async () => {
    try {
      const path = await uploadDatabaseFile();
      if (path) addDatabase(path);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <Button onClick={handleUpload} disabled={isLoading}>
      Upload Database
    </Button>
  );
};
```

### State Updates
- **Immutable Updates**: Zustand handles immutability internally
- **Batch Updates**: Related state changes in single action
- **Error States**: Centralized error handling through store

## Service Layer

### Service Organization
Services are organized by domain and handle business logic:

```typescript
// services/capacityQuery.ts
export async function getCapacity(
  dbPath: string,
  assetName: string
): Promise<CapacityData[]> {
  return genericApacheIPC<CapacityData>('get_capacity', {
    dbPath,
    assetName
  });
}
```

### IPC Communication Pattern
```typescript
// gateway/db.ts
export async function genericApacheIPC<T>(
  cmd: string,
  args?: InvokeArgs
): Promise<T[]> {
  try {
    const table = await apacheIPC(cmd, args);
    return table.toArray() as Array<T>;
  } catch (error) {
    console.error(`Error calling ${cmd}:`, error);
    throw error;
  }
}
```

### Service Integration in Components
```typescript
const ChartComponent: React.FC<{ graphId: string }> = ({ graphId }) => {
  const [data, setData] = useState<ChartData[]>([]);
  const graph = useVisualizationStore(state => state.mustGetGraph(graphId));

  useEffect(() => {
    if (!graph.graphDBFilePath) return;

    const loadData = async () => {
      try {
        const result = await getChartData(graph.graphDBFilePath, graph.options);
        setData(result);
      } catch (error) {
        console.error('Data loading failed:', error);
      }
    };

    loadData();
  }, [graph.graphDBFilePath, graph.options, graph.lastApplyTimestamp]);

  return <EChartsReact option={createChartOptions(data)} />;
};
```

## Testing Strategy

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly with required props', () => {
    renderWithProviders(<ComponentName graphId="test" />);
    expect(screen.getByTestId('component')).toBeInTheDocument();
  });

  it('handles user interactions correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComponentName graphId="test" />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Expected Result')).toBeInTheDocument();
  });
});
```

### Mock Patterns
```typescript
// Mock Tauri IPC
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve(mockData))
}));

// Mock service functions
vi.mock('../services/capacityQuery', () => ({
  getCapacity: vi.fn(() => Promise.resolve(mockCapacityData))
}));
```

### Component Testing Utilities
```typescript
// test/utils.tsx
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    initialStoreState?: Partial<VisualizationState>;
  }
) {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MantineProvider theme={theme}>
      {children}
    </MantineProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}
```

## Performance Guidelines

### Component Optimization
```typescript
// Use React.memo for expensive pure components
const ExpensiveChart = React.memo<ChartProps>(({ data, options }) => {
  const chartOptions = useMemo(() => 
    createChartOptions(data, options), [data, options]
  );
  
  return <EChartsReact option={chartOptions} />;
});

// Use useCallback for event handlers
const Component: React.FC = () => {
  const handleClick = useCallback((id: string) => {
    updateGraph(id, { isSelected: true });
  }, [updateGraph]);

  return <Button onClick={() => handleClick('graph-1')} />;
};
```

### Data Fetching Optimization
```typescript
// Prevent unnecessary re-fetches
useEffect(() => {
  if (!shouldFetchData) return;
  
  const controller = new AbortController();
  
  fetchData(params, controller.signal)
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    });

  return () => controller.abort();
}, [shouldFetchData, params]);
```

### Memory Management
- **Clean up subscriptions** in useEffect cleanup
- **Abort pending requests** when component unmounts
- **Use appropriate dependencies** in useEffect/useMemo
- **Avoid creating objects** in render methods

### Bundle Optimization
- **Dynamic imports** for large chart libraries
- **Code splitting** by route when applicable
- **Tree shaking** enabled in Vite configuration
- **Proper externals** configuration for Tauri

## Common Patterns

### Data Loading with Error Handling
```typescript
const useAsyncData = <T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[]
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchFn()
      .then(result => {
        if (mounted) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, dependencies);

  return { data, loading, error };
};
```

### Form State Management
```typescript
const useFormState = <T>(initialState: T) => {
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const validate = useCallback((validators: Partial<Record<keyof T, (value: T[keyof T]) => string | undefined>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.entries(validators).forEach(([field, validator]) => {
      const error = validator(values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values]);

  return { values, errors, updateField, validate };
};
```
