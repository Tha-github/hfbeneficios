import { useEffect, useState } from 'react'
import { publishedContent, settings } from '../content'
import type { SiteContent } from '../content/schema'
import { SiteApp, type ImageOverrides } from './App'
import { isPreviewMode, listenForPreview } from './preview'

/** Aplica as cores autorizadas via CSSOM (permitido pela CSP, ao contrário de estilos inline). */
function applyTheme(theme: SiteContent['theme']) {
  const root = document.documentElement.style
  root.setProperty('--brand', theme.brand)
  root.setProperty('--brand-deep', theme.brandDeep)
  root.setProperty('--accent', theme.accent)
  root.setProperty('--surface-tint', theme.surfaceTint)
}

export function Root() {
  const [content, setContent] = useState<SiteContent>(publishedContent)
  const [images, setImages] = useState<ImageOverrides>({})

  useEffect(() => {
    if (!isPreviewMode()) return
    return listenForPreview((draft, draftImages) => {
      applyTheme(draft.theme)
      setContent(draft)
      setImages(draftImages)
    })
  }, [])

  return <SiteApp content={content} settings={settings} imageOverrides={images} />
}
