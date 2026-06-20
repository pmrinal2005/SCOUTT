// We no longer use Vite for build. The serverless Hono app is shipped
// straight to Vercel via api/index.ts (no bundling needed for Node runtime).
// This file exists only so `vite` commands don't error if someone runs them.
import { defineConfig } from 'vite'

export default defineConfig({
  // Intentionally minimal. Real entry is `scripts/dev.ts` (local) and
  // `api/index.ts` (Vercel). Build is a no-op.
  appType: 'custom',
  server: { port: 3000 },
})
