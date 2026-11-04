import { useId, useMemo, useState } from 'react'
import type { SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import { SECTIONS, collectTextFields, getAt, setText, type TextField } from './fields'
import styles from './admin.module.css'

interface TextEditorProps {
  draft: SiteContent
  baseline: SiteContent
  errors: Map<string, string>
  onChange: (next: SiteContent) => void
}

export function TextEditor({ draft, baseline, errors, onChange }: TextEditorProps) {
  const [section, setSection] = useState<string>(SECTIONS[0].id)
  const fields = useMemo(() => collectTextFields(draft), [draft])
  const visible = fields.filter((f) => f.section === section)

  const groups = visible.reduce<Map<string, TextField[]>>((acc, field) => {
    const list = acc.get(field.group) ?? []
    list.push(field)
    acc.set(field.group, list)
    return acc
  }, new Map())

  const countFor = (id: string) =>
    fields.filter((f) => f.section === id && getAt(baseline, f.path) !== getAt(draft, f.path)).length

  return (
    <div className={styles.editorLayout}>
      <nav aria-label="Seções do site" className={styles.sectionNav}>
        <ul>
          {SECTIONS.map((s) => {
            const count = countFor(s.id)
            const hasError = fields.some((f) => f.section === s.id && errors.has(f.key))
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={section === s.id ? 'true' : undefined}
                  className={styles.sectionButton}
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                  {hasError ? (
                    <span className={styles.errorDot} aria-label="contém erro" />
                  ) : (
                    count > 0 && <span className={styles.countPill}>{count}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={styles.fieldsColumn}>
        {[...groups.entries()].map(([group, list]) => (
          <section key={group || 'geral'} className={styles.card} aria-label={group || SECTIONS.find((s) => s.id === section)?.label}>
            {group && <h2 className={styles.cardTitle}>{group}</h2>}
            <div className={styles.fieldList}>
              {list.map((field) => (
                <TextInput
                  key={field.key}
                  field={field}
                  value={getAt(draft, field.path) as string}
                  original={getAt(baseline, field.path) as string}
                  error={errors.get(field.key)}
                  onChange={(value) => onChange(setText(draft, field.path, value))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

interface TextInputProps {
  field: TextField
  value: string
  original: string
  error?: string
  onChange: (value: string) => void
}

export function TextInput({ field, value, original, error, onChange }: TextInputProps) {
  const id = useId()
  const modified = value !== original
  const describedBy = [`${id}-contador`, error ? `${id}-erro` : null].filter(Boolean).join(' ')
  const common = {
    id,
    value,
    // Margem acima do limite para que o erro de validação seja exibido em vez de cortar o texto.
    maxLength: field.max ? field.max + 20 : undefined,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    className: styles.input,
    spellCheck: true,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  }

  return (
    <div className={`${styles.field} ${modified ? styles.fieldModified : ''}`}>
      <div className={styles.fieldHead}>
        <label htmlFor={id}>
          {field.label}
          {modified && <span className={styles.modifiedTag}>alterado</span>}
        </label>
        {modified && (
          <button type="button" className={styles.linkButton} onClick={() => onChange(original)}>
            <Icon name="undo" />
            Restaurar
          </button>
        )}
      </div>
      {field.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
      <div className={styles.fieldFoot}>
        {error ? (
          <p id={`${id}-erro`} className={styles.fieldError}>
            {error}
          </p>
        ) : (
          <span />
        )}
        <span id={`${id}-contador`} className={styles.counter}>
          {value.length}
          {field.max ? ` / ${field.max}` : ''} caracteres
        </span>
      </div>
    </div>
  )
}
