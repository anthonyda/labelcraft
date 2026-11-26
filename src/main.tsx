import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import './theme.css'
import { applyTheme } from './ui/theme'
import App from './App.tsx'

// R25.AC2: apply the saved theme before the first paint.
applyTheme()

// R30.AC3: offline copy for the installed app (built site only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
