// =====================================================================
// Vercel serverless entry. Every non-static request hits this function.
// Hono runs on Node inside Vercel. Static files in /public are served
// directly by Vercel's CDN (see vercel.json rewrites).
//
// IMPORTANT: Do NOT export `config = { runtime: 'nodejs20.x' }` here.
// Vercel's `config` export only accepts "edge" or "experimental-edge".
// The Node runtime is selected via vercel.json -> functions.runtime.
// =====================================================================
import { handle } from 'hono/vercel'
import app from '../src/index.js'

export default handle(app)
