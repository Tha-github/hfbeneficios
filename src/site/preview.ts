import type { ImageOverrides } from './App'
import type { SiteContent } from '../content/schema'

/*
 * Protocolo de prévia do painel: o painel (mesma origem) envia o rascunho ao iframe do site.
 * O site só aceita mensagens da janela-mãe e da mesma origem, e valida o conteúdo com o
 * schema fechado antes de renderizar. Imagens de prévia precisam ser blob: da mesma origem.
 */

export const PREVIEW_MESSAGE = 'hf:preview'
export const PREVIEW_READY = 'hf:preview-ready'

export interface PreviewPayload {
  type: typeof PREVIEW_MESSAGE
  content: unknown
  images: Record<string, unknown>
}

export function isPreviewMode(): boolean {
  return new URLSearchParams(window.location.search).get('preview') === '1' && window.parent !== window
}

export function listenForPreview(apply: (content: SiteContent, images: ImageOverrides) => void): () => void {
  const onMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return
    const data = event.data as Partial<PreviewPayload> | null
    if (!data || data.type !== PREVIEW_MESSAGE) return

    const { siteSchema } = await import('../content/schema')
    const parsed = siteSchema.safeParse(data.content)
    if (!parsed.success) return

    const about = data.images?.about
    const images: ImageOverrides = {}
    if (typeof about === 'string' && about.startsWith(`blob:${window.location.origin}/`)) images.about = about
    apply(parsed.data, images)
  }

  window.addEventListener('message', onMessage)
  window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin)
  return () => window.removeEventListener('message', onMessage)
}
