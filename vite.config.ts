import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? '/Jabu---sams/' : '/',
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
