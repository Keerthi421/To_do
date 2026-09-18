import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/To_do/',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: 'es2022', sourcemap: true }
});
