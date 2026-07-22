import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDoorDimOverrides } from './admin/standardsStore'

// Admin-editierte Standard-Tuermasse (falls vorhanden) muessen VOR dem ersten
// Render angewendet werden, da OPENING_TYPES als gemeinsame Modul-Konstante
// ueberall direkt referenziert wird (Jonas' Vorgabe 2026-07-22).
applyDoorDimOverrides()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
