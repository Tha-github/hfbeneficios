import { siteSchema, type SiteContent } from '../content/schema'

/*
 * Rascunho local: apenas conveniência para não perder edições ao recarregar.
 * NÃO é armazenamento definitivo nem publicação — o conteúdo oficial vive no repositório.
 * Imagens não são guardadas aqui.
 */

const KEY = 'hf-admin-rascunho-v1'

export function loadDraft(): { content: SiteContent; savedAt: string } | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { content?: unknown; savedAt?: unknown }
    const parsed = siteSchema.safeParse(data.content)
    if (!parsed.success || typeof data.savedAt !== 'string') return null
    return { content: data.content as SiteContent, savedAt: data.savedAt }
  } catch {
    return null
  }
}

export function saveDraft(content: SiteContent): string | null {
  const savedAt = new Date().toISOString()
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ content, savedAt }))
    return savedAt
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* armazenamento indisponível: nada a limpar */
  }
}

/** Importa um site.json (ex.: exportado anteriormente). Exige o schema fechado. */
export function parseImportedContent(text: string): { ok: true; content: SiteContent } | { ok: false; message: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, message: 'O arquivo não é um JSON válido.' }
  }
  const parsed = siteSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, message: `Arquivo fora do formato permitido (${first.path.join('.') || 'raiz'}: ${first.message}).` }
  }
  return { ok: true, content: data as SiteContent }
}

export function serializeContent(content: SiteContent): string {
  return `${JSON.stringify(content, null, 2)}\n`
}
