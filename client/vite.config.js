import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(
  { babel: { plugins: ['@babel/plugin-transform-runtime'] } } // Add this line to enable async/await support
  ), tailwindcss()],
   resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ✅ alias for @
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },

})
