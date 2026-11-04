import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { SiteContent } from '../../content/schema'
import { AUDIENCE_IDS } from '../../content/schema-ids'
import {
  UFS,
  buildLeadMessage,
  buildWhatsAppUrl,
  formatPhone,
  validateLead,
  type LeadErrors,
  type LeadFormValues,
} from '../lib/lead'
import { useQuote } from '../lib/quote'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './LeadForm.module.css'

interface LeadFormProps {
  content: SiteContent['contact']['form']
  services: SiteContent['services']['items']
  whatsappNumber: string
}

type Status = { kind: 'success' | 'unavailable'; message: string } | null

const FIELD_ORDER: (keyof LeadFormValues)[] = ['name', 'phone', 'clientType', 'specialty', 'city', 'state']

export function LeadForm({ content, services, whatsappNumber }: LeadFormProps) {
  const { values, setValues } = useQuote()
  const [errors, setErrors] = useState<LeadErrors>({})
  const [status, setStatus] = useState<Status>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()
  const id = (field: string) => `${uid}-${field}`

  const update = (field: keyof LeadFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = event.target.value
    const value = field === 'phone' ? formatPhone(raw) : raw
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    setStatus(null)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateLead(values)
    if (!result.ok) {
      setErrors(result.errors)
      setStatus(null)
      const first = FIELD_ORDER.find((field) => result.errors[field])
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
      return
    }
    setErrors({})
    const message = buildLeadMessage(result.lead, {
      intro: content.messageIntro,
      clientTypes: content.clientTypes,
      specialties: Object.fromEntries(services.map((s) => [s.id, s.name])) as Record<(typeof services)[number]['id'], string>,
    })
    const url = buildWhatsAppUrl(whatsappNumber, message)
    if (!url) {
      setStatus({ kind: 'unavailable', message: content.unavailableMessage })
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    setStatus({ kind: 'success', message: content.successMessage })
  }

  const describedBy = (field: keyof LeadFormValues, hint?: string) =>
    [hint, errors[field] ? id(`${field}-erro`) : null].filter(Boolean).join(' ') || undefined

  const errorText = (field: keyof LeadFormValues) =>
    errors[field] ? (
      <p id={id(`${field}-erro`)} className={styles.error}>
        {errors[field]}
      </p>
    ) : null

  return (
    <form ref={formRef} className={styles.form} noValidate onSubmit={onSubmit} aria-labelledby={id('titulo')}>
      <h3 id={id('titulo')} className={styles.title}>
        {content.title}
      </h3>

      <div className={styles.field}>
        <label htmlFor={id('name')}>{content.nameLabel}</label>
        <input
          id={id('name')}
          data-field="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          value={values.name}
          onChange={update('name')}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy('name')}
        />
        {errorText('name')}
      </div>

      <div className={styles.field}>
        <label htmlFor={id('phone')}>{content.phoneLabel}</label>
        <input
          id={id('phone')}
          data-field="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={16}
          required
          value={values.phone}
          onChange={update('phone')}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy('phone', id('phone-dica'))}
        />
        <p id={id('phone-dica')} className={styles.hint}>
          {content.phoneHint}
        </p>
        {errorText('phone')}
      </div>

      <fieldset className={styles.fieldset} aria-describedby={describedBy('clientType')}>
        <legend>{content.clientTypeLabel}</legend>
        <div className={styles.segmented}>
          {AUDIENCE_IDS.map((audience, index) => (
            <label key={audience} className={styles.segment}>
              <input
                type="radio"
                name="clientType"
                value={audience}
                data-field={index === 0 ? 'clientType' : undefined}
                checked={values.clientType === audience}
                onChange={update('clientType')}
              />
              <span>{content.clientTypes[audience]}</span>
            </label>
          ))}
        </div>
        {errorText('clientType')}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={id('specialty')}>{content.specialtyLabel}</label>
        <div className={styles.selectWrap}>
          <select
            id={id('specialty')}
            data-field="specialty"
            name="specialty"
            required
            value={values.specialty}
            onChange={update('specialty')}
            aria-invalid={Boolean(errors.specialty)}
            aria-describedby={describedBy('specialty')}
          >
            <option value="">Selecione</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        {errorText('specialty')}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={id('city')}>{content.cityLabel}</label>
          <input
            id={id('city')}
            data-field="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={60}
            value={values.city}
            onChange={update('city')}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={describedBy('city')}
          />
          {errorText('city')}
        </div>
        <div className={`${styles.field} ${styles.uf}`}>
          <label htmlFor={id('state')}>{content.stateLabel}</label>
          <div className={styles.selectWrap}>
            <select
              id={id('state')}
              data-field="state"
              name="state"
              autoComplete="address-level1"
              value={values.state}
              onChange={update('state')}
              aria-invalid={Boolean(errors.state)}
              aria-describedby={describedBy('state')}
            >
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          {errorText('state')}
        </div>
      </div>

      <p className={styles.privacy}>
        <Icon name="lock" />
        <span>{content.privacyNotice}</span>
      </p>

      <button type="submit" className={`${ui.primary} ${ui.block}`}>
        <Icon name="chat" />
        {content.submitLabel}
      </button>

      <div role="status" aria-live="polite" className={styles.statusRegion}>
        {status && (
          <p className={status.kind === 'success' ? styles.success : styles.unavailable}>{status.message}</p>
        )}
      </div>
    </form>
  )
}
