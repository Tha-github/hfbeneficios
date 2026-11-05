import type { Settings, SiteContent } from '../../src/content/schema'
import settingsJson from './settings.json'
import siteJson from './site.json'

/*
 * Cópia fixa do conteúdo para os testes unitários. O site.json real é editado pelo painel,
 * então os testes de comportamento não podem depender dos textos publicados.
 */
export const publishedContent = siteJson as unknown as SiteContent
export const settings = settingsJson as unknown as Settings
