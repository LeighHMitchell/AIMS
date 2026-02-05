import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Include patterns
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'e2e/**'
    ],

    // Global setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-reports/coverage',
      include: [
        'src/lib/**/*.ts',
        'src/app/api/**/*.ts'
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts'
      ]
    },

    // Timeout for tests
    testTimeout: 60000, // 60 seconds

    // Reporter configuration
    reporters: ['verbose'],

    // Pool options
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
