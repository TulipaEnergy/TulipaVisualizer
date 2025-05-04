import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DuckDB from '@jetblack/duckdb-react';
import { VITE_BUNDLES } from './duckdbBundles';
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The jetblack github repo included wrapping it in duckdb bundle like below, but not sure how it works */}
    {/* <DuckDB bundles={VITE_BUNDLES}> */}
      <App />
    {/* </DuckDB> */}
  </StrictMode>,
)
