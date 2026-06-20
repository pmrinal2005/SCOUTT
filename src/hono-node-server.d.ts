declare module '@hono/node-server/serve-static' {
  // Returns a Hono middleware. The runtime types may be missing on certain
  // versions of @hono/node-server, so we declare a loose handler shape here.
  export function serveStatic(options: {
    root?: string
    path?: string
    rewriteRequestPath?: (path: string) => string
  }): (c: unknown, next: () => Promise<void>) => Promise<Response | void>
}
