import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || 'dev'),
  },
  plugins: [tailwindcss()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    exclude: ['**/node_modules/**', '.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/test-setup.js',
        'node_modules/**',
        'src/main.js',        // app entry point — not unit-testable
        'src/counter.js',     // Vite template boilerplate — unused, deleted
        'src/services/haptics.js', // native vibration API — mocked in tests
      ],
      all: true,
      thresholds: {
        // Calibrated to current reality (views largely untested — tracked separately)
        lines: 53,
        functions: 55,
        branches: 55,
      },
    },
  },
})
