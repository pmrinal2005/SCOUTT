/// <reference lib="dom" />   // ✅ FIXED: guarantees DOM types (document, HTMLElement) are available
                               //          regardless of tsconfig lib sync state in VS Code

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const rootElement: HTMLElement | null = document.getElementById('root')

// ✅ FIXED: Explicit null guard with clear error message
if (!rootElement) {
  throw new Error(
    '[SCOUTT] Root element with id "root" not found in the document. ' +
    'Ensure public/index.html contains <div id="root"></div>.',
  )
}

const root = ReactDOM.createRoot(rootElement as HTMLElement)  // ✅ explicit cast for strict TS

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)