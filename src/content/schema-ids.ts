/** Identificadores fixos da estrutura. Módulo sem dependências para uso no bundle público. */

export const SERVICE_IDS = ['planos-saude', 'planos-odontologicos', 'seguro-saude', 'seguros-agricolas'] as const
export type ServiceId = (typeof SERVICE_IDS)[number]

export const AUDIENCE_IDS = ['pessoas', 'empresas', 'rural'] as const
export type AudienceId = (typeof AUDIENCE_IDS)[number]

/** Perfis aceitos no cadastro "Seja Nosso Parceiro". */
export const PARTNER_PROFILES = ['corretor', 'vendedor', 'empresa'] as const
export type PartnerProfile = (typeof PARTNER_PROFILES)[number]
