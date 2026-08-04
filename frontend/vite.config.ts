import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  return {
    envDir: './src',
    build: {
      outDir: './dist',
    },
    assetsInclude: ['**/*.pdf'],
    base: '/Portfolio/',
    plugins: [react()],
    server: {
      port: 3005,
      host: 'localhost',
      open: true,
    },
  };
});
