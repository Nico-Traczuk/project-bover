import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
  },
  resolve: {
    dedupe: ['pixi.js'],
  },
  optimizeDeps: {
    include: ['pixi.js'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
