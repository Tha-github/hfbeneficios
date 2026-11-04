/** Identificadores fixos da estrutura. Módulo sem dependências para uso no bundle público. */

export const SERVICE_IDS = ['planos-saude', 'planos-odontologicos', 'seguro-saude', 'seguros-agricolas'] as const
export type ServiceId = (typeof SERVICE_IDS)[number]

export const AUDIENCE_IDS = ['pessoas', 'empresas', 'rural'] as const
export type AudienceId = (typeof AUDIENCE_IDS)[number]
