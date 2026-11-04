import '@fontsource-variable/plus-jakarta-sans/wght.css'
import 'virtual:hf-theme.css'
import '../site/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminApp } from './AdminApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
