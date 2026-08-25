import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { canSkipEmbedAuth, requestEmbedAuth } from './config/embedGate.ts'
import { applyEmbedStandardConfig } from './config/embedStandardConfig.ts'

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

function Root() {
  // Lazy-Initializer: auf hayse.de/Beta/lokal ist der Host nicht gegatet,
  // dann kann `<App />` schon im allerersten Render erscheinen statt erst
  // nach dem asynchronen postMessage-Roundtrip (vermeidet einen kurzen
  // leeren Frame bei jedem normalen Seitenaufruf, siehe canSkipEmbedAuth).
  const [allowed, setAllowed] = useState<boolean | null>(() =>
    canSkipEmbedAuth() ? true : null,
  )

  useEffect(() => {
    return requestEmbedAuth((allowed, config) => {
      if (allowed) applyEmbedStandardConfig(config)
      setAllowed(allowed)
    })
  }, [])

  if (allowed === null) return null
  return allowed ? <App /> : <EmbedBlockedScreen />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
