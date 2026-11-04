import { z } from 'zod'
import { siteSchema, type SiteContent } from '../content/schema'

/*
 * O painel só edita folhas de texto que JÁ existem no conteúdo publicado.
 * Não há operação de inserir/remover: a estrutura é preservada por construção
 * e, de novo, pelo schema fechado.
 */

export type Path = (string | number)[]

export interface TextField {
  path: Path
  key: string
  section: string
  group: string
  label: string
  max?: number
  multiline: boolean
}

export const SECTIONS: { id: keyof SiteContent; label: string }[] = [
  { id: 'meta', label: 'SEO e compartilhamento' },
  { id: 'header', label: 'Cabeçalho' },
  { id: 'hero', label: 'Hero' },
  { id: 'selector', label: 'Seletor de especialidades' },
  { id: 'services', label: 'Especialidades' },
  { id: 'about', label: 'Sobre a HF' },
  { id: 'differentials', label: 'Diferenciais' },
  { id: 'audiences', label: 'Para quem' },
  { id: 'contact', label: 'Contato e formulário' },
  { id: 'footer', label: 'Rodapé' },
]

/** Campos tratados em outras telas (cores, imagens) ou imutáveis (identificadores, caminhos). */
const EXCLUDED = [/^theme\./, /\.id$/, /^about\.image\./, /^meta\.ogImageAlt$/]

const KEY_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  eyebrow: 'Selo da seção',
  text: 'Texto',
  name: 'Nome',
  tag: 'Público / subtítulo',
  summary: 'Resumo',
  ctaLabel: 'Texto do botão',
  primaryCta: 'Botão principal',
  secondaryCta: 'Botão secundário',
  trustNote: 'Nota de confiança',
  label: 'Rótulo',
  status: 'Selo de status',
  partnersValue: 'Número de destaque',
  partnersLabel: 'Legenda do número',
  coverage: 'Cartão de abrangência',
  consultive: 'Cartão de atendimento',
  panel: 'Painel ilustrativo',
  stepsTitle: 'Título das etapas',
  requestLabel: 'Rótulo da especialidade selecionada',
  imageCard: 'Cartão sobre a imagem',
  highlightValue: 'Número de destaque',
  featuredBadge: 'Selo do cartão em destaque',
  nav: 'Menu',
  solutions: 'Soluções',
  about: 'Sobre',
  differentials: 'Diferenciais',
  audiences: 'Para quem',
  contact: 'Contato',
  form: 'Formulário',
  nameLabel: 'Rótulo do nome',
  phoneLabel: 'Rótulo do WhatsApp',
  phoneHint: 'Dica do WhatsApp',
  clientTypeLabel: 'Rótulo do tipo de cliente',
  clientTypes: 'Tipos de cliente',
  pessoas: 'Pessoa física',
  empresas: 'Empresa',
  rural: 'Produtor rural',
  specialtyLabel: 'Rótulo da especialidade',
  cityLabel: 'Rótulo da cidade',
  stateLabel: 'Rótulo da UF',
  submitLabel: 'Botão de envio',
  privacyNotice: 'Aviso de privacidade',
  messageIntro: 'Abertura da mensagem do WhatsApp',
  successMessage: 'Mensagem após abrir o WhatsApp',
  unavailableMessage: 'Mensagem se o WhatsApp não estiver configurado',
  ctaTitle: 'Título da chamada',
  ctaText: 'Texto da chamada',
  tagline: 'Descrição institucional',
  rights: 'Direitos reservados',
}

const ITEM_LABELS: Record<string, string> = {
  items: 'Item',
  highlights: 'Destaque',
  paragraphs: 'Parágrafo',
  pillars: 'Pilar',
  points: 'Tópico',
  steps: 'Etapa',
  aside: 'Destaque lateral',
}

const MULTILINE_KEYS = new Set(['description', 'summary', 'text', 'privacyNotice', 'successMessage', 'unavailableMessage', 'tagline', 'messageIntro', 'ctaText', 'trustNote'])

export const pathKey = (path: Path) => path.join('.')

export function getAt(source: unknown, path: Path): unknown {
  return path.reduce<unknown>((node, seg) => (node as Record<string | number, unknown> | undefined)?.[seg], source)
}

/** Altera uma folha de texto existente. Recusa caminhos que não apontem para um texto existente. */
export function setText(content: SiteContent, path: Path, value: string): SiteContent {
  if (typeof getAt(content, path) !== 'string') throw new Error(`Campo inexistente: ${pathKey(path)}`)
  const next = structuredClone(content)
  const parent = getAt(next, path.slice(0, -1)) as Record<string | number, unknown>
  parent[path[path.length - 1]] = value
  return next
}

function schemaAt(path: Path): z.ZodType | undefined {
  let node: z.ZodType | undefined = siteSchema
  for (const seg of path) {
    if (node instanceof z.ZodObject) node = (node.shape as Record<string, z.ZodType>)[seg as string]
    else if (node instanceof z.ZodTuple) node = (node.def.items as z.ZodType[])[seg as number]
    else return undefined
  }
  return node
}

export function maxLengthAt(path: Path): number | undefined {
  const node = schemaAt(path)
  return node instanceof z.ZodString ? (node.maxLength ?? undefined) : undefined
}

function labelFor(path: Path): string {
  const parts: string[] = []
  for (let i = 1; i < path.length; i++) {
    const seg = path[i]
    if (typeof seg === 'number') {
      const parent = String(path[i - 1])
      if (parent === 'items') continue
      parts.push(`${ITEM_LABELS[parent] ?? 'Item'} ${seg + 1}`)
    } else if (!(seg in ITEM_LABELS)) {
      parts.push(KEY_LABELS[seg] ?? seg)
    }
  }
  return parts.join(' › ')
}

function groupFor(content: SiteContent, path: Path): string {
  const itemsIndex = path.indexOf('items')
  if (itemsIndex === -1 || typeof path[itemsIndex + 1] !== 'number') return ''
  const item = getAt(content, path.slice(0, itemsIndex + 2)) as { name?: string; title?: string }
  const index = (path[itemsIndex + 1] as number) + 1
  return `${index}. ${item.name ?? item.title ?? ''}`.trim()
}

/** Lista as folhas de texto editáveis, na ordem do conteúdo. */
export function collectTextFields(content: SiteContent): TextField[] {
  const fields: TextField[] = []
  const walk = (node: unknown, path: Path) => {
    if (typeof node === 'string') {
      const key = pathKey(path)
      if (EXCLUDED.some((rule) => rule.test(key))) return
      const leaf = String(path.findLast((seg) => typeof seg === 'string'))
      fields.push({
        path,
        key,
        section: String(path[0]),
        group: groupFor(content, path),
        label: labelFor(path) || KEY_LABELS[leaf] || leaf,
        max: maxLengthAt(path),
        multiline: MULTILINE_KEYS.has(leaf) || (maxLengthAt(path) ?? 0) > 120,
      })
      return
    }
    if (Array.isArray(node)) node.forEach((child, i) => walk(child, [...path, i]))
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, [...path, k])
  }
  walk(content, [])
  return fields
}

export interface Change {
  key: string
  label: string
  before: string
  after: string
}

/** Diferenças de texto/cor entre o conteúdo publicado e o rascunho. */
export function diffContent(published: SiteContent, draft: SiteContent): Change[] {
  const changes: Change[] = []
  const walk = (a: unknown, b: unknown, path: Path) => {
    if (typeof a === 'string') {
      if (a !== b) {
        const section = SECTIONS.find((s) => s.id === path[0])?.label ?? (path[0] === 'theme' ? 'Cores' : String(path[0]))
        changes.push({ key: pathKey(path), label: `${section} › ${labelFor(path) || pathKey(path)}`, before: a, after: String(b) })
      }
      return
    }
    if (Array.isArray(a)) a.forEach((child, i) => walk(child, (b as unknown[])?.[i], [...path, i]))
    else if (a && typeof a === 'object') {
      for (const [k, v] of Object.entries(a)) walk(v, (b as Record<string, unknown>)?.[k], [...path, k])
    }
  }
  walk(published, draft, [])
  return changes
}

/** Mapa caminho → mensagem de erro, a partir da validação do schema fechado. */
export function validationErrors(draft: SiteContent): Map<string, string> {
  const result = siteSchema.safeParse(draft)
  const errors = new Map<string, string>()
  if (!result.success) for (const issue of result.error.issues) errors.set(issue.path.join('.'), issue.message)
  return errors
}
