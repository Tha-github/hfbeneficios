import '@fontsource-variable/plus-jakarta-sans/wght.css'
import 'virtual:hf-theme.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { Root } from './Root'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <Root />
  </StrictMode>
)

// Em produção o HTML vem pré-renderizado (scripts/prerender.ts); em desenvolvimento, não.
if (container.firstElementChild) hydrateRoot(container, app)
else createRoot(container).render(app)
