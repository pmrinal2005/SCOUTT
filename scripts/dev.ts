/// <reference types="node" />  // ✅ FIXED: makes __dirname, process, require available in TS

import { execSync } from 'child_process'
import * as path from 'path'

const rootDir: string = path.resolve(__dirname, '..')  // ✅ __dirname now recognized

function runDev(): void {
  console.log('[SCOUTT] Starting development server...')
  console.log(`[SCOUTT] Root directory: ${rootDir}`)

  try {
    execSync(
      'npx ts-node --project tsconfig.json api/index.ts',  // ✅ FIXED: runs backend, not React frontend
      {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'development',
          NODE_PATH: rootDir,        // ✅ ensures module resolution works from project root
        },
      },
    )
  } catch (error) {
    console.error('[SCOUTT] Dev server failed to start:', error)
    process.exit(1)
  }
}

runDev()