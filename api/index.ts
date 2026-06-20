// =====================================================================
// Vercel serverless entry. Every non-static request hits this function.
// Hono runs on Node 20 inside Vercel. Static files in /public are served
// directly by Vercel's CDN (see vercel.json rewrites).
// =====================================================================
import { handle } from 'hono/vercel'
import app from '../src/index.js'

export const config = {
  // Node runtime (Edge would not support @supabase/supabase-js cleanly)
  runtime: 'nodejs20.x',
}

export default handle(app)
