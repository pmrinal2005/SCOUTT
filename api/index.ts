// api/index.ts
// =====================================================================
// Vercel Serverless Entry Point for Hono.
// Vercel's @vercel/node runtime picks this up automatically.
// We use hono/vercel's `handle` adapter to bridge Hono ↔ Vercel.
// =====================================================================
import { handle } from 'hono/vercel'
import app from '../src/index.js'

// Tell Vercel to use the Node.js runtime (not Edge).
// Required when using Supabase, Node crypto, etc.
export const config = {
  runtime: 'nodejs20.x',
}

// Vercel calls these exports for each HTTP method.
// `handle` wraps the Hono app's fetch handler into a Vercel-compatible handler.
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
export const HEAD = handle(app)
export const OPTIONS = handle(app)