import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      base: './',
      build: {
        assetsDir: '',
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['.onrender.com'],
      },
      preview: {
        allowedHosts: ['.onrender.com'],
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
