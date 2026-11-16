import { describe, expect, it } from 'vitest'
import { EMPTY_PARTNER, buildPartnerMessage, partnerSchema, validatePartner } from '../../src/site/lib/partner'

const labels = { intro: 'Olá! Quero ser parceiro.', profiles: { corretor: 'Corretor', vendedor: 'Vendedor', empresa: 'Empresa' } }
const valid = { ...EMPTY_PARTNER, name: 'João Lima', phone: '(65) 99999-1234', profile: 'corretor' } as const

describe('cadastro de parceiro', () => {
  it('coleta apenas dados de contato e perfil (sem CPF ou documentos)', () => {
    expect(Object.keys(partnerSchema.shape).sort()).toEqual(['city', 'company', 'email', 'name', 'phone', 'profile', 'state'])
  })

  it('exige nome, WhatsApp e perfil; e-mail, empresa e localidade são opcionais', () => {
    const result = validatePartner(EMPTY_PARTNER)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['name', 'phone', 'profile'])
    expect(validatePartner(valid).ok).toBe(true)
  })

  it('valida e-mail e empresa quando preenchidos', () => {
    const result = validatePartner({ ...valid, email: 'joao@', company: '<script>' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.email).toBeDefined()
      expect(result.errors.company).toBeDefined()
    }
    expect(validatePartner({ ...valid, email: 'joao@corretora.com.br', company: 'Lima & Filhos Corretora' }).ok).toBe(true)
  })

  it('monta a mensagem só com os campos preenchidos', () => {
    const result = validatePartner({ ...valid, company: 'Lima Corretora', city: 'Cuiabá', state: 'MT' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const message = buildPartnerMessage(result.partner, labels)
    expect(message).toContain('Perfil: Corretor')
    expect(message).toContain('Empresa/corretora: Lima Corretora')
    expect(message).toContain('Localidade: Cuiabá / MT')
    expect(message).not.toContain('E-mail')
  })
})
