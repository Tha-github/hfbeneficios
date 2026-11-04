import { describe, expect, it } from 'vitest'
import { settingsSchema, siteSchema, type SiteContent } from '../../src/content/schema'
import settingsJson from '../../src/content/settings.json'
import siteJson from '../../src/content/site.json'

const clone = (): SiteContent => structuredClone(siteJson) as unknown as SiteContent
const issuesOf = (data: unknown) => {
  const result = siteSchema.safeParse(data)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('schema fechado do conteúdo', () => {
  it('aceita o conteúdo publicado', () => {
    expect(siteSchema.safeParse(siteJson).success).toBe(true)
    expect(settingsSchema.safeParse(settingsJson).success).toBe(true)
  })

  it('mantém exatamente 4 especialidades, 8 diferenciais e 3 públicos', () => {
    const content = clone()
    expect(content.services.items.map((s) => s.id)).toEqual([
      'planos-saude',
      'planos-odontologicos',
      'seguro-saude',
      'seguros-agricolas',
    ])
    expect(content.differentials.items).toHaveLength(8)
    expect(content.audiences.items).toHaveLength(3)
  })

  it('rejeita seção nova', () => {
    const data = { ...clone(), testimonialsSection: { title: 'x' } }
    expect(siteSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita remoção de seção', () => {
    const data: Partial<SiteContent> = clone()
    delete data.differentials
    expect(siteSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita adicionar ou remover itens', () => {
    const added = clone() as unknown as { differentials: { items: unknown[] } }
    added.differentials.items.push({ title: 'Novo', text: 'Item extra' })
    expect(siteSchema.safeParse(added).success).toBe(false)

    const removed = clone() as unknown as { services: { items: unknown[] } }
    removed.services.items.pop()
    expect(siteSchema.safeParse(removed).success).toBe(false)
  })

  it('rejeita campo extra dentro de um item', () => {
    const data = clone() as unknown as { services: { items: Record<string, unknown>[] } }
    data.services.items[0].price = 'R$ 99'
    expect(siteSchema.safeParse(data).success).toBe(false)
  })

  it('impede trocar identificadores e caminhos de imagem', () => {
    const data = clone() as unknown as { services: { items: { id: string }[] }; about: { image: { src: string } } }
    data.services.items[0].id = 'seguro-auto'
    data.about.image.src = 'https://exemplo.com/x.png'
    expect(issuesOf(data)).toEqual(expect.arrayContaining(['services.items.0.id', 'about.image.src']))
  })

  it.each([
    ['<script>alert(1)</script>'],
    ['<img src=x onerror=alert(1)>'],
    ['javascript:alert(1)'],
    ['texto\u0000oculto'],
    ['texto‮invertido'],
  ])('rejeita texto perigoso: %s', (value) => {
    const data = clone()
    data.hero.title = value
    expect(issuesOf(data)).toContain('hero.title')
  })

  it('aplica limite de caracteres e texto obrigatório', () => {
    const long = clone()
    long.hero.title = 'a'.repeat(200)
    expect(issuesOf(long)).toContain('hero.title')

    const empty = clone()
    empty.footer.rights = '   '
    expect(issuesOf(empty)).toContain('footer.rights')
  })
})

describe('cores autorizadas', () => {
  const withTheme = (theme: Partial<SiteContent['theme']>) => {
    const data = clone()
    data.theme = { ...data.theme, ...theme }
    return issuesOf(data)
  }

  it('rejeita formato inválido', () => {
    expect(withTheme({ brand: 'blue' })).toContain('theme.brand')
    expect(withTheme({ brand: '#12345' })).toContain('theme.brand')
  })

  it('rejeita cores vetadas pela identidade', () => {
    expect(withTheme({ brand: '#C81E1E' })).toContain('theme.brand') // vermelho
    expect(withTheme({ brand: '#7E22CE' })).toContain('theme.brand') // roxo
    expect(withTheme({ accent: '#BE185D' })).toContain('theme.accent') // rosa
  })

  it('rejeita contraste insuficiente', () => {
    expect(withTheme({ brand: '#7FA6FF' })).toContain('theme.brand')
    expect(withTheme({ surfaceTint: '#9DB4E8' })).toContain('theme.surfaceTint')
  })

  it('aceita uma variação azul com bom contraste', () => {
    expect(withTheme({ brand: '#1D4ED8', accent: '#0E7490' })).toEqual([])
  })
})

describe('configurações técnicas', () => {
  it('rejeita links de redes sociais fora dos domínios autorizados ou sem https', () => {
    const data = structuredClone(settingsJson)
    data.social[0].url = 'https://phishing.example.com/hf'
    expect(settingsSchema.safeParse(data).success).toBe(false)
    data.social[0].url = 'http://instagram.com/hfbeneficios.mt'
    expect(settingsSchema.safeParse(data).success).toBe(false)
    data.social[0].url = 'https://www.instagram.com/hfbeneficios.mt'
    expect(settingsSchema.safeParse(data).success).toBe(true)
  })

  it('exige depoimentos autorizados', () => {
    const data = structuredClone(settingsJson) as unknown as { testimonials: { enabled: boolean; items: unknown[] } }
    data.testimonials = { enabled: true, items: [{ name: 'A', context: 'B', quote: 'C', authorized: false }] }
    expect(settingsSchema.safeParse(data).success).toBe(false)
  })

  it('valida o formato do número de WhatsApp', () => {
    const data = structuredClone(settingsJson)
    data.whatsappNumber = '(65) 99999-0000'
    expect(settingsSchema.safeParse(data).success).toBe(false)
    data.whatsappNumber = '5565999990000'
    expect(settingsSchema.safeParse(data).success).toBe(true)
  })
})
