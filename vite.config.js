import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Bump the warning limit slightly; heavy vendors are split out below.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Charting
          charts: ['recharts'],
          // Spreadsheet export (heavy, only used on a few pages)
          xlsx: ['xlsx'],
          // PDF generation (heavy, only used for printing/exports)
          pdf: ['jspdf', 'jspdf-autotable'],
          // Backend client
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
