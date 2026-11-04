import { describe, expect, it } from 'vitest'
import {
  EMPTY_LEAD,
  buildLeadMessage,
  buildWhatsAppUrl,
  formatPhone,
  leadSchema,
  normalizePhone,
  validateLead,
} from '../../src/site/lib/lead'

const labels = {
  intro: 'Olá! Gostaria de uma cotação.',
  clientTypes: { pessoas: 'Pessoa física', empresas: 'Empresa', rural: 'Produtor rural' },
  specialties: {
    'planos-saude': 'Planos de Saúde',
    'planos-odontologicos': 'Planos Odontológicos',
    'seguro-saude': 'Seguro Saúde',
    'seguros-agricolas': 'Seguros Agrícolas',
  },
} as const

const valid = { ...EMPTY_LEAD, name: 'Maria Souza', phone: '(65) 99999-1234', clientType: 'pessoas', specialty: 'planos-saude' } as const

describe('formulário de cotação', () => {
  it('coleta apenas os campos necessários (sem CPF ou dados de saúde)', () => {
    expect(Object.keys(leadSchema.shape).sort()).toEqual(['city', 'clientType', 'name', 'phone', 'specialty', 'state'])
  })

  it('normaliza e formata telefone', () => {
    expect(normalizePhone('+55 (65) 99999-1234')).toBe('65999991234')
    expect(formatPhone('6599999123')).toBe('(65) 9999-9123')
    expect(formatPhone('65999991234')).toBe('(65) 99999-1234')
  })

  it('valida campos obrigatórios', () => {
    const result = validateLead(EMPTY_LEAD)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['clientType', 'name', 'phone', 'specialty'])
  })

  it('rejeita telefone inválido e nome com símbolos', () => {
    const result = validateLead({ ...valid, phone: '123', name: '<b>Maria</b>' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.phone).toBeDefined()
      expect(result.errors.name).toBeDefined()
    }
  })

  it('monta mensagem e URL oficial do WhatsApp com texto codificado', () => {
    const result = validateLead({ ...valid, city: 'Cuiabá', state: 'MT' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const message = buildLeadMessage(result.lead, labels)
    expect(message).toContain('Nome: Maria Souza')
    expect(message).toContain('Especialidade: Planos de Saúde')
    expect(message).toContain('Localidade: Cuiabá / MT')
    const url = buildWhatsAppUrl('5565999990000', message)!
    expect(url.startsWith('https://wa.me/5565999990000?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toBe(message)
  })

  it('não gera URL sem número configurado', () => {
    expect(buildWhatsAppUrl('', 'oi')).toBeNull()
    expect(buildWhatsAppUrl('javascript:alert(1)', 'oi')).toBeNull()
  })
})
