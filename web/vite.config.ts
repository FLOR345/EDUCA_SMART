import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Los datos de ejemplo viven en ../examples (compartidos con la versión Python).
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
})
