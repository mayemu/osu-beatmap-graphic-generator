import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are linked correctly on GitHub Pages
  define: {
    // Prevents crashes when accessing process.env in the browser
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});