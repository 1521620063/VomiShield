import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDocumentViewMode } from './viewMode'
import { installDesktopExperience } from './desktopExperience'

applyDocumentViewMode(document, window.location.hash === '#/overlay')
installDesktopExperience(document)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
