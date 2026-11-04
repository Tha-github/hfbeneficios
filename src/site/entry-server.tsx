import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { publishedContent, settings } from '../content'
import { SiteApp } from './App'

/** Usado apenas no build para gerar o HTML estático da página inicial. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <SiteApp content={publishedContent} settings={settings} />
    </StrictMode>,
  )
}
