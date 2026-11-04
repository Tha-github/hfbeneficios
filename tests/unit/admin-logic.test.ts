import { describe, expect, it } from 'vitest'
import { publishedContent } from '../../src/content'
import { parseImportedContent, saveDraft, loadDraft, serializeContent } from '../../src/admin/draftStorage'
import { collectTextFields, diffContent, maxLengthAt, setText, validationErrors } from '../../src/admin/fields'

describe('campos editáveis do painel', () => {
  const fields = collectTextFields(publishedContent)

  it('lista apenas textos, sem cores, identificadores ou caminhos de imagem', () => {
    const keys = fields.map((f) => f.key)
    expect(keys).toContain('hero.title')
    expect(keys).toContain('services.items.3.highlights.2')
    expect(keys.some((k) => k.startsWith('theme.'))).toBe(false)
    expect(keys.some((k) => k.endsWith('.id'))).toBe(false)
    expect(keys).not.toContain('about.image.src')
  })

  it('lê limites do schema', () => {
    expect(maxLengthAt(['hero', 'title'])).toBe(90)
    expect(fields.find((f) => f.key === 'hero.title')?.max).toBe(90)
  })

  it('altera texto sem mudar a estrutura', () => {
    const next = setText(publishedContent, ['hero', 'title'], 'Novo título para o hero')
    expect(next.hero.title).toBe('Novo título para o hero')
    expect(publishedContent.hero.title).not.toBe(next.hero.title)
    expect(collectTextFields(next).map((f) => f.key)).toEqual(fields.map((f) => f.key))
  })

  it('recusa criar campos ou alterar caminhos inexistentes', () => {
    expect(() => setText(publishedContent, ['hero', 'novoCampo'], 'x')).toThrow()
    expect(() => setText(publishedContent, ['differentials', 'items', 8, 'title'], 'x')).toThrow()
    expect(() => setText(publishedContent, ['services', 'items'], 'x')).toThrow()
  })

  it('indica alterações e erros de validação', () => {
    const next = setText(publishedContent, ['footer', 'rights'], '<script>')
    expect(diffContent(publishedContent, next)).toHaveLength(1)
    expect(validationErrors(next).has('footer.rights')).toBe(true)
    expect(validationErrors(publishedContent).size).toBe(0)
  })
})

describe('rascunho e importação', () => {
  it('guarda e recupera rascunho válido', () => {
    const next = setText(publishedContent, ['hero', 'eyebrow'], 'Corretora HF')
    saveDraft(next)
    expect(loadDraft()?.content.hero.eyebrow).toBe('Corretora HF')
  })

  it('descarta rascunho adulterado', () => {
    window.localStorage.setItem('hf-admin-rascunho-v1', JSON.stringify({ content: { hero: {} }, savedAt: 'x' }))
    expect(loadDraft()).toBeNull()
  })

  it('importa somente JSON no formato fechado', () => {
    expect(parseImportedContent(serializeContent(publishedContent)).ok).toBe(true)
    expect(parseImportedContent('{').ok).toBe(false)
    const extra = { ...publishedContent, scripts: ['x'] }
    expect(parseImportedContent(JSON.stringify(extra)).ok).toBe(false)
  })
})
