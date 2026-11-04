import { z } from 'zod'
import { HEX_PATTERN, contrastRatio, forbiddenHue, formatRatio, hexToHsl } from './color'
import type { AudienceId, ServiceId } from './schema-ids'

export { AUDIENCE_IDS, SERVICE_IDS, type AudienceId, type ServiceId } from './schema-ids'

/*
 * Schema FECHADO do conteúdo do site.
 * - Objetos estritos: chaves extras são rejeitadas.
 * - Listas são tuplas de tamanho fixo: não é possível adicionar nem remover itens.
 * - Identificadores e caminhos de imagem são literais: não podem ser alterados.
 * - Textos não aceitam marcação, caracteres de controle nem esquemas de URL executáveis.
 */

// Intencional: detecta caracteres de controle e de reordenação bidirecional invisíveis.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS =/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/
const MARKUP = /[<>]/
const SCRIPT_SCHEME = /(javascript|vbscript|data)\s*:/i

export const text = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `Use pelo menos ${min} caractere(s).`)
    .max(max, `Use no máximo ${max} caracteres.`)
    .refine((v) => !CONTROL_CHARS.test(v), 'Remova caracteres de controle invisíveis.')
    .refine((v) => !MARKUP.test(v), 'Os caracteres < e > não são permitidos.')
    .refine((v) => !SCRIPT_SCHEME.test(v), 'Este texto contém um padrão de código não permitido.')

const hexColor = z.string().regex(HEX_PATTERN, 'Use o formato hexadecimal #RRGGBB.')

export const COLOR_TOKENS = ['brand', 'brandDeep', 'accent', 'surfaceTint'] as const
export type ColorToken = (typeof COLOR_TOKENS)[number]

export interface ColorRule {
  label: string
  usage: string
  check: (theme: Record<ColorToken, string>) => { ok: boolean; message: string }[]
}

const WHITE = '#FFFFFF'

const contrastCheck = (fg: string, bg: string, min: number, what: string) => {
  const ratio = contrastRatio(fg, bg)
  return { ok: ratio >= min, message: `${what}: ${formatRatio(ratio)} (mínimo ${formatRatio(min)})` }
}

const hueCheck = (hex: string) => {
  const hue = forbiddenHue(hex)
  return { ok: hue === null, message: hue ? `Família de cor vetada pela identidade: ${hue}` : 'Família de cor permitida' }
}

/** Regras das cores autorizadas. Exibidas no painel e aplicadas no schema. */
export const COLOR_RULES: Record<ColorToken, ColorRule> = {
  brand: {
    label: 'Cor principal',
    usage: 'Botões, links, destaques e ícones.',
    check: (t) => [contrastCheck(WHITE, t.brand, 4.5, 'Texto branco sobre a cor'), hueCheck(t.brand)],
  },
  brandDeep: {
    label: 'Cor profunda',
    usage: 'Textos, títulos, rodapé e cartões escuros.',
    check: (t) => [contrastCheck(WHITE, t.brandDeep, 10, 'Texto branco sobre a cor'), hueCheck(t.brandDeep)],
  },
  accent: {
    label: 'Cor de apoio',
    usage: 'Detalhes de status e destaque da proteção rural.',
    check: (t) => [contrastCheck(WHITE, t.accent, 4.5, 'Texto branco sobre a cor'), hueCheck(t.accent)],
  },
  surfaceTint: {
    label: 'Fundo suave',
    usage: 'Fundos de seções e blocos de interface.',
    check: (t) => [
      contrastCheck(t.brandDeep, t.surfaceTint, 10, 'Texto na cor profunda sobre o fundo'),
      { ok: hexToHsl(t.surfaceTint).l >= 0.9, message: 'O fundo suave precisa ser claro (luminosidade ≥ 90%).' },
      hueCheck(t.surfaceTint),
    ],
  },
}

export const themeSchema = z
  .strictObject({ brand: hexColor, brandDeep: hexColor, accent: hexColor, surfaceTint: hexColor })
  .superRefine((theme, ctx) => {
    for (const token of COLOR_TOKENS) {
      if (!HEX_PATTERN.test(theme[token])) continue
      if (!COLOR_TOKENS.every((t) => HEX_PATTERN.test(theme[t]))) return
      for (const result of COLOR_RULES[token].check(theme)) {
        if (!result.ok) ctx.addIssue({ code: 'custom', path: [token], message: result.message })
      }
    }
  })

const titledText = (titleMax: number, textMax: number) => z.strictObject({ title: text(titleMax), text: text(textMax) })

const service = <T extends ServiceId>(id: T) =>
  z.strictObject({
    id: z.literal(id),
    name: text(40),
    tag: text(40),
    summary: text(220),
    highlights: z.tuple([text(70), text(70), text(70)]),
    ctaLabel: text(40),
  })

const audience = <T extends AudienceId, P extends z.ZodTuple>(id: T, points: P) =>
  z.strictObject({
    id: z.literal(id),
    title: text(40),
    description: text(160),
    points,
    ctaLabel: text(40),
  })

const point = () => text(60)

const sectionIntro = {
  eyebrow: text(40),
  title: text(110),
  description: text(240),
}

export const siteSchema = z.strictObject({
  meta: z.strictObject({
    title: text(70, 20),
    description: text(170, 70),
    ogImageAlt: text(140),
  }),
  theme: themeSchema,
  header: z.strictObject({
    nav: z.strictObject({
      solutions: text(20),
      about: text(20),
      differentials: text(20),
      audiences: text(20),
      contact: text(20),
    }),
    ctaLabel: text(30),
  }),
  hero: z.strictObject({
    eyebrow: text(50),
    title: text(90),
    description: text(220),
    primaryCta: text(30),
    secondaryCta: text(30),
    trustNote: text(120),
    panel: z.strictObject({ label: text(40), title: text(60), status: text(30) }),
    partnersValue: text(8),
    partnersLabel: text(40),
    coverage: titledText(40, 80),
    consultive: titledText(40, 80),
  }),
  selector: z.strictObject({
    ...sectionIntro,
    stepsTitle: text(50),
    steps: z.tuple([titledText(40, 110), titledText(40, 110), titledText(40, 110)]),
    requestLabel: text(40),
  }),
  services: z.strictObject({
    items: z.tuple([
      service('planos-saude'),
      service('planos-odontologicos'),
      service('seguro-saude'),
      service('seguros-agricolas'),
    ]),
  }),
  about: z.strictObject({
    eyebrow: text(40),
    title: text(120),
    paragraphs: z.tuple([text(420), text(420)]),
    pillars: z.tuple([titledText(40, 120), titledText(40, 120), titledText(40, 120), titledText(40, 120), titledText(40, 120)]),
    image: z.strictObject({ src: z.literal('images/sobre.webp'), alt: text(160) }),
    imageCard: titledText(60, 100),
  }),
  differentials: z.strictObject({
    ...sectionIntro,
    highlightValue: text(8),
    items: z.tuple([
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
      titledText(50, 150),
    ]),
  }),
  audiences: z.strictObject({
    ...sectionIntro,
    featuredBadge: text(40),
    items: z.tuple([
      audience('pessoas', z.tuple([point(), point(), point(), point()])),
      audience('empresas', z.tuple([point(), point(), point(), point()])),
      audience('rural', z.tuple([point(), point(), point()])),
    ]),
  }),
  contact: z.strictObject({
    ...sectionIntro,
    aside: z.tuple([titledText(50, 140), titledText(50, 140), titledText(50, 140)]),
    form: z.strictObject({
      title: text(60),
      nameLabel: text(40),
      phoneLabel: text(40),
      phoneHint: text(80),
      clientTypeLabel: text(40),
      clientTypes: z.strictObject({ pessoas: text(30), empresas: text(30), rural: text(30) }),
      specialtyLabel: text(50),
      cityLabel: text(40),
      stateLabel: text(40),
      submitLabel: text(40),
      privacyNotice: text(320),
      messageIntro: text(160),
      successMessage: text(220),
      unavailableMessage: text(220),
    }),
  }),
  footer: z.strictObject({
    ctaTitle: text(80),
    ctaText: text(160),
    ctaLabel: text(30),
    tagline: text(180),
    rights: text(80),
  }),
})

export type SiteContent = z.infer<typeof siteSchema>
export type Theme = SiteContent['theme']
export type Service = SiteContent['services']['items'][number]
export type Audience = SiteContent['audiences']['items'][number]

/* ---------- Configurações técnicas (somente desenvolvedor, fora do painel) ---------- */

const SOCIAL_HOSTS = ['instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'linkedin.com', 'www.linkedin.com']

const socialUrl = z.union([
  z.literal(''),
  z
    .url({ protocol: /^https$/, message: 'Use uma URL https válida.' })
    .refine((u) => SOCIAL_HOSTS.includes(new URL(u).hostname), 'Domínio de rede social não autorizado.'),
])

export const settingsSchema = z.strictObject({
  siteName: text(60),
  responsible: text(60),
  /** Somente dígitos, com DDI 55 e DDD. Vazio enquanto o número não for confirmado. */
  whatsappNumber: z.union([z.literal(''), z.string().regex(/^55\d{10,11}$/, 'Use 55 + DDD + número, só dígitos.')]),
  /** owner/repo do GitHub, usado pelo painel para abrir o fluxo de Pull Request. */
  repository: z.union([z.literal(''), z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Use o formato owner/repositorio.')]),
  branch: z.string().regex(/^[\w./-]+$/),
  social: z.tuple([
    z.strictObject({ handle: z.literal('@hfbeneficios.mt'), label: text(30), url: socialUrl }),
    z.strictObject({ handle: z.literal('@hfbeneficios'), label: text(30), url: socialUrl }),
  ]),
  testimonials: z.strictObject({
    enabled: z.boolean(),
    items: z
      .array(
        z.strictObject({
          name: text(60),
          context: text(60),
          quote: text(400),
          /** Precisa ser true: só depoimentos fornecidos e autorizados por escrito. */
          authorized: z.literal(true),
        }),
      )
      .max(6),
  }),
})

export type Settings = z.infer<typeof settingsSchema>

/** Formata problemas de validação com o caminho do campo, para o painel e para o CI. */
export function formatIssues(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}
