import * as z from 'zod/mini'
import { PARTNER_PROFILES, type PartnerProfile } from '../../content/schema-ids'
import { UFS, formatPhone, normalizePhone } from './lead'

/*
 * Cadastro "Seja Nosso Parceiro": dados para a equipe da HF entrar em contato.
 * Sem CPF, documentos ou dados sensíveis.
 */

const NAME_PATTERN = /^[\p{L}\p{M}' .-]+$/u
const COMPANY_PATTERN = /^[\p{L}\p{M}\p{N}' .,&/()-]+$/u

export const partnerSchema = z.object({
  name: z
    .string()
    .check(
      z.trim(),
      z.minLength(2, 'Informe seu nome.'),
      z.maxLength(80, 'Use no máximo 80 caracteres.'),
      z.regex(NAME_PATTERN, 'Use apenas letras no nome.'),
    ),
  phone: z
    .string()
    .check(z.refine((v) => /^[1-9]{2}9?\d{8}$/.test(normalizePhone(v)), 'Informe um WhatsApp válido com DDD.')),
  email: z
    .string()
    .check(
      z.trim(),
      z.maxLength(120, 'Use no máximo 120 caracteres.'),
      z.refine((v) => v === '' || /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v), 'Informe um e-mail válido.'),
    ),
  profile: z.enum(PARTNER_PROFILES, 'Selecione uma opção.'),
  company: z
    .string()
    .check(
      z.trim(),
      z.maxLength(80, 'Use no máximo 80 caracteres.'),
      z.refine((v) => v === '' || COMPANY_PATTERN.test(v), 'Use apenas letras, números e pontuação simples.'),
    ),
  city: z
    .string()
    .check(
      z.trim(),
      z.maxLength(60, 'Use no máximo 60 caracteres.'),
      z.refine((v) => v === '' || NAME_PATTERN.test(v), 'Use apenas letras na cidade.'),
    ),
  state: z.union([z.literal(''), z.enum(UFS)]),
})

export type Partner = z.output<typeof partnerSchema>

export interface PartnerFormValues {
  name: string
  phone: string
  email: string
  profile: PartnerProfile | ''
  company: string
  city: string
  state: string
}

export type PartnerErrors = Partial<Record<keyof PartnerFormValues, string>>

export const EMPTY_PARTNER: PartnerFormValues = { name: '', phone: '', email: '', profile: '', company: '', city: '', state: '' }

export function validatePartner(input: PartnerFormValues): { ok: true; partner: Partner } | { ok: false; errors: PartnerErrors } {
  const result = partnerSchema.safeParse(input)
  if (result.success) return { ok: true, partner: result.data }
  const errors: PartnerErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof PartnerFormValues
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}

export function buildPartnerMessage(partner: Partner, labels: { intro: string; profiles: Record<PartnerProfile, string> }): string {
  const location = [partner.city, partner.state].filter(Boolean).join(' / ')
  return [
    labels.intro,
    '',
    `Nome: ${partner.name}`,
    `WhatsApp: ${formatPhone(partner.phone)}`,
    ...(partner.email ? [`E-mail: ${partner.email}`] : []),
    `Perfil: ${labels.profiles[partner.profile]}`,
    ...(partner.company ? [`Empresa/corretora: ${partner.company}`] : []),
    ...(location ? [`Localidade: ${location}`] : []),
  ].join('\n')
}
