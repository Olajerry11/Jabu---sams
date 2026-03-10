import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    base: process.env.VITE_GH_PAGES === 'true' ? '/Jabu---sams/' : '/',
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
