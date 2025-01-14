import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    // optional
    open: '/public/app.html',
  },
  build: {
    rollupOptions: {
       input: {
        main: path.resolve(__dirname, 'home.html'),     // Homepage at /
        app: path.resolve(__dirname, 'public/app.html'), // App at /app
        support: path.resolve(__dirname, 'public/support.html'),
        privacy: path.resolve(__dirname, 'public/privacy.html'),
        terms: path.resolve(__dirname, 'public/terms.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Keep your 'public' folder for images, icons, etc.
  publicDir: 'public',
});