// api/index.ts
// =====================================================================
// Vercel Serverless Entry Point.
// @vercel/node's built-in esbuild bundler transpiles this file +
// all imports from src/ automatically — no manual build step needed.
// =====================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../src/index.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Build a standard Request object from Vercel's req
  const protocol = req.headers['x-forwarded-proto'] ?? 'https'
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost'
  const url = `${protocol}://${host}${req.url ?? '/'}`

  // Collect body for POST/PUT/PATCH
  const body: Buffer | undefined = await new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined))
    req.on('error', () => resolve(undefined))
  })

  // Build headers map
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v))
    } else {
      headers.set(key, value)
    }
  }

  // Create a Fetch API Request
  const fetchRequest = new Request(url, {
    method: req.method ?? 'GET',
    headers,
    body:
      req.method !== 'GET' && req.method !== 'HEAD' && body?.length
        ? body
        : undefined,
  })

  // Run through the Hono app
  const fetchResponse = await app.fetch(fetchRequest)

  // Forward status + headers back to Vercel
  res.status(fetchResponse.status)
  fetchResponse.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  // Stream body back
  const responseBody = await fetchResponse.arrayBuffer()
  res.end(Buffer.from(responseBody))
}