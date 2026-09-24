import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Plain unit tests for server logic that has no Nuxt runtime dependency.
export default defineConfig({
  resolve: {
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
})
