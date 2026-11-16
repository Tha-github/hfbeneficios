import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { SiteContent } from '../../content/schema'
import { PARTNER_PROFILES } from '../../content/schema-ids'
import { UFS, buildWhatsAppUrl, formatPhone } from '../lib/lead'
import { EMPTY_PARTNER, buildPartnerMessage, validatePartner, type PartnerErrors, type PartnerFormValues } from '../lib/partner'
import ui from '../styles/ui.module.css'
import { Icon, type IconName } from './Icon'
import form from './LeadForm.module.css'
import styles from './PartnerSection.module.css'

interface PartnerSectionProps {
  content: SiteContent['partner']
  whatsappNumber: string
}

const ASIDE_ICONS: IconName[] = ['users', 'grid', 'chat']
const FIELD_ORDER: (keyof PartnerFormValues)[] = ['name', 'phone', 'email', 'profile', 'company', 'city', 'state']

type Status = { kind: 'success' | 'unavailable'; message: string } | null

export function PartnerSection({ content, whatsappNumber }: PartnerSectionProps) {
  return (
    <section id="parceiro" className={styles.section} aria-labelledby="parceiro-title">
      <div className={ui.container}>
        <div className={styles.shell}>
          <div className={`${styles.copy} ${ui.onDark}`}>
            <p className={ui.eyebrowDark}>{content.eyebrow}</p>
            <h2 id="parceiro-title" className={ui.title}>
              {content.title}
            </h2>
            <p className={styles.lead}>{content.description}</p>
            <ul className={styles.aside}>
              {content.aside.map((item, index) => (
                <li key={item.title}>
                  <span className={styles.asideIcon} aria-hidden="true">
                    <Icon name={ASIDE_ICONS[index]} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.formCard}>
            <PartnerForm content={content.form} whatsappNumber={whatsappNumber} />
          </div>
        </div>
      </div>
    </section>
  )
}

function PartnerForm({ content, whatsappNumber }: { content: SiteContent['partner']['form']; whatsappNumber: string }) {
  const [values, setValues] = useState<PartnerFormValues>(EMPTY_PARTNER)
  const [errors, setErrors] = useState<PartnerErrors>({})
  const [status, setStatus] = useState<Status>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()
  const id = (field: string) => `${uid}-${field}`

  const update = (field: keyof PartnerFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = event.target.value
    setValues((current) => ({ ...current, [field]: field === 'phone' ? formatPhone(raw) : raw }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    setStatus(null)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = validatePartner(values)
    if (!result.ok) {
      setErrors(result.errors)
      setStatus(null)
      const first = FIELD_ORDER.find((field) => result.errors[field])
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
      return
    }
    setErrors({})
    const url = buildWhatsAppUrl(whatsappNumber, buildPartnerMessage(result.partner, { intro: content.messageIntro, profiles: content.profiles }))
    if (!url) {
      setStatus({ kind: 'unavailable', message: content.unavailableMessage })
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    setStatus({ kind: 'success', message: content.successMessage })
  }

  const describedBy = (field: keyof PartnerFormValues, hint?: string) =>
    [hint, errors[field] ? id(`${field}-erro`) : null].filter(Boolean).join(' ') || undefined

  const errorText = (field: keyof PartnerFormValues) =>
    errors[field] ? (
      <p id={id(`${field}-erro`)} className={form.error}>
        {errors[field]}
      </p>
    ) : null

  const textField = (
    field: 'name' | 'email' | 'company',
    label: string,
    attrs: { type: string; autoComplete: string; maxLength: number; required?: boolean },
  ) => (
    <div className={form.field}>
      <label htmlFor={id(field)}>{label}</label>
      <input
        id={id(field)}
        data-field={field}
        name={field}
        {...attrs}
        value={values[field]}
        onChange={update(field)}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={describedBy(field)}
      />
      {errorText(field)}
    </div>
  )

  return (
    <form ref={formRef} className={form.form} noValidate onSubmit={onSubmit} aria-labelledby={id('titulo')}>
      <h3 id={id('titulo')} className={form.title}>
        {content.title}
      </h3>

      {textField('name', content.nameLabel, { type: 'text', autoComplete: 'name', maxLength: 80, required: true })}

      <div className={form.field}>
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
        <p id={id('phone-dica')} className={form.hint}>
          {content.phoneHint}
        </p>
        {errorText('phone')}
      </div>

      {textField('email', content.emailLabel, { type: 'email', autoComplete: 'email', maxLength: 120 })}

      <fieldset className={form.fieldset} aria-describedby={describedBy('profile')}>
        <legend>{content.profileLabel}</legend>
        <div className={form.segmented}>
          {PARTNER_PROFILES.map((profile, index) => (
            <label key={profile} className={form.segment}>
              <input
                type="radio"
                name="profile"
                value={profile}
                data-field={index === 0 ? 'profile' : undefined}
                checked={values.profile === profile}
                onChange={update('profile')}
              />
              <span>{content.profiles[profile]}</span>
            </label>
          ))}
        </div>
        {errorText('profile')}
      </fieldset>

      {textField('company', content.companyLabel, { type: 'text', autoComplete: 'organization', maxLength: 80 })}

      <div className={form.row}>
        <div className={form.field}>
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
        <div className={form.field}>
          <label htmlFor={id('state')}>{content.stateLabel}</label>
          <div className={form.selectWrap}>
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

      <p className={form.privacy}>
        <Icon name="lock" />
        <span>{content.privacyNotice}</span>
      </p>

      <button type="submit" className={`${ui.primary} ${ui.block}`}>
        <Icon name="chat" />
        {content.submitLabel}
      </button>

      <div role="status" aria-live="polite" className={form.statusRegion}>
        {status && <p className={status.kind === 'success' ? form.success : form.unavailable}>{status.message}</p>}
      </div>
    </form>
  )
}
