import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Leading dot matches the domain and all subdomains, so any ngrok URL works
    // without editing this on every restart.
    allowedHosts: ['.ngrok-free.app']
  }
})
