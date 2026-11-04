import type { IconName } from '../components/Icon'
import type { AudienceId, ServiceId } from '../../content/schema-ids'

/** Ícones vinculados à estrutura fixa (não editáveis pelo painel). */
export const SERVICE_ICONS: Record<ServiceId, IconName> = {
  'planos-saude': 'health',
  'planos-odontologicos': 'tooth',
  'seguro-saude': 'shield',
  'seguros-agricolas': 'sprout',
}

export const AUDIENCE_ICONS: Record<AudienceId, IconName> = {
  pessoas: 'users',
  empresas: 'building',
  rural: 'field',
}

export const DIFFERENTIAL_ICONS: IconName[] = [
  'layers',
  'grid',
  'sliders',
  'target',
  'chat',
  'briefcase',
  'sprout',
  'globe',
]
