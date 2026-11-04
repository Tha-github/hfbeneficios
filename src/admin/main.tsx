import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource-variable/jost/wght.css'
import 'virtual:hf-theme.css'
import '../site/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AccessGate } from './AccessGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate />
  </StrictMode>,
)
