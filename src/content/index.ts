import type { Settings, SiteContent } from './schema'
import settingsJson from './settings.json'
import siteJson from './site.json'

/*
 * O conteúdo é validado pelo schema no build (scripts/validate-content.ts) e no painel.
 * Aqui apenas tipamos o JSON para não carregar o Zod no pacote do site público.
 */
export const publishedContent = siteJson as unknown as SiteContent
export const settings = settingsJson as unknown as Settings

/** Resolve caminhos de /public respeitando o base path do GitHub Pages. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
