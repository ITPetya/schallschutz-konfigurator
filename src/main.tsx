import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isEmbedAccessBlocked } from './config/embedGate.ts'

function EmbedBlockedScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0c',
        color: '#e5e5e5',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div>
        Diese Seite ist nur über{' '}
        <a href="https://hayse.de" style={{ color: '#7db8ff' }}>
          hayse.de
        </a>{' '}
        erreichbar.
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isEmbedAccessBlocked() ? <EmbedBlockedScreen /> : <App />}
  </StrictMode>,
)
