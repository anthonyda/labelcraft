import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme.css'
import { applyTheme } from './ui/theme'
import App from './App.tsx'

// R25.AC2: apply the saved theme before the first paint.
applyTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
