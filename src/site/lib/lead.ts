import * as z from 'zod/mini'
import { AUDIENCE_IDS, SERVICE_IDS, type AudienceId, type ServiceId } from '../../content/schema-ids'

/*
 * Formulário de cotação: somente os dados necessários para iniciar o atendimento.
 * Não há campos de CPF, documentos ou informações de saúde.
 */

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

/** Normaliza o telefone para DDD + número (10 ou 11 dígitos), removendo o DDI 55 se informado. */
export function normalizePhone(value: string): string {
  const digits = onlyDigits(value)
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits
}

export function formatPhone(value: string): string {
  const d = normalizePhone(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const NAME_PATTERN = /^[\p{L}\p{M}' .-]+$/u

export const leadSchema = z.object({
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
  clientType: z.enum(AUDIENCE_IDS, 'Selecione uma opção.'),
  specialty: z.enum(SERVICE_IDS, 'Selecione a especialidade.'),
  city: z
    .string()
    .check(
      z.trim(),
      z.maxLength(60, 'Use no máximo 60 caracteres.'),
      z.refine((v) => v === '' || NAME_PATTERN.test(v), 'Use apenas letras na cidade.'),
    ),
  state: z.union([z.literal(''), z.enum(UFS)]),
})

export type Lead = z.output<typeof leadSchema>

/** Valores do formulário enquanto o usuário preenche (seleções podem estar vazias). */
export interface LeadFormValues {
  name: string
  phone: string
  clientType: AudienceId | ''
  specialty: ServiceId | ''
  city: string
  state: string
}

export type LeadErrors = Partial<Record<keyof LeadFormValues, string>>

export const EMPTY_LEAD: LeadFormValues = { name: '', phone: '', clientType: '', specialty: '', city: '', state: '' }

export function validateLead(input: LeadFormValues): { ok: true; lead: Lead } | { ok: false; errors: LeadErrors } {
  const result = leadSchema.safeParse(input)
  if (result.success) return { ok: true, lead: result.data }
  const errors: LeadErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof LeadFormValues
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}

export interface MessageLabels {
  intro: string
  clientTypes: Record<AudienceId, string>
  specialties: Record<ServiceId, string>
}

export function buildLeadMessage(lead: Lead, labels: MessageLabels): string {
  const location = [lead.city, lead.state].filter(Boolean).join(' / ')
  return [
    labels.intro,
    '',
    `Nome: ${lead.name}`,
    `WhatsApp: ${formatPhone(lead.phone)}`,
    `Perfil: ${labels.clientTypes[lead.clientType]}`,
    `Especialidade: ${labels.specialties[lead.specialty]}`,
    ...(location ? [`Localidade: ${location}`] : []),
  ].join('\n')
}

/** URL oficial de clique para conversar do WhatsApp. Retorna null se o número não estiver configurado. */
export function buildWhatsAppUrl(number: string, message: string): string | null {
  if (!/^55\d{10,11}$/.test(number)) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
