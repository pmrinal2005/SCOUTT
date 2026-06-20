// api/index.ts
// =====================================================================
// Vercel Edge Runtime entry point for the Hono app.
//
// WHY EDGE RUNTIME:
//   - Native Web Fetch API → no Node.js CJS/ESM conflict
//   - Vercel's esbuild correctly handles JSX (jsxImportSource: hono/jsx)
//   - hono/vercel's handle() is the official adapter for this pattern
//   - No manual Request/Response bridging needed
//   - Eliminates the body-stream crash from the Node.js approach
// =====================================================================
import { handle } from 'hono/vercel'
import app from '../src/index.js'

// Tell Vercel to use the Edge Runtime (not Node.js Lambda)
export const config = {
  runtime: 'edge',
}

// Single default export — Vercel calls this for every request
export default handle(app)