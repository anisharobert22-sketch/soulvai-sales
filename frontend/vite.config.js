import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: '/sales/' - this app is served at app.soulvai.ai/sales (Accura's
// Vercel deployment proxies that path here), not at its own domain root,
// so every built asset URL needs the /sales/ prefix baked in or the
// browser will request them from app.soulvai.ai/assets/... instead of
// .../sales/assets/... and 404. See App.jsx's matching Router basename.
export default defineConfig({
  base: '/sales/',
  plugins: [react()],
})
