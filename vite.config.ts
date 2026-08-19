import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Zwei Build-Eintraege statt nur index.html (Jonas' Vorgabe 2026-08-19:
      // der 3D-Viewer soll eigenstaendig als Einbettung/iframe in anderen
      // Webseiten nutzbar sein, siehe viewer.html/src/viewer-entry.tsx).
      // WICHTIG: sobald `input` hier explizit gesetzt ist, ersetzt das
      // Vite's Standard-Eintrag komplett - `main` (index.html) MUSS deshalb
      // mit aufgefuehrt werden, sonst baut `npm run build` nur noch den
      // Viewer und die Haupt-App faellt aus dem Build.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        viewer: fileURLToPath(new URL('./viewer.html', import.meta.url)),
      },
    },
  },
})
