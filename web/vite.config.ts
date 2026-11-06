import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js expects a Node-style `global`.
  define: { global: 'globalThis' },
  server: { port: 5173 },
});
