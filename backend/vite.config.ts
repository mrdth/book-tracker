import { defineConfig } from 'vite';
import path from 'path';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        // All Node.js built-in modules (including with 'node:' prefix)
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        // npm dependencies
        'express',
        'better-sqlite3',
        'graphql',
        'graphql-request',
        'cors',
        'p-limit',
        'dotenv',
      ],
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    ssr: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
