import { useId, useState } from 'react'
import { HEX_PATTERN } from '../content/color'
import { COLOR_RULES, COLOR_TOKENS, type ColorToken, type SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import styles from './admin.module.css'

const normalizeHex = (input: string) => {
  const value = input.trim().toUpperCase()
  return value.startsWith('#') ? value : `#${value}`
}

interface ColorEditorProps {
  draft: SiteContent
  baseline: SiteContent
  errors: Map<string, string>
  onChange: (next: SiteContent) => void
}

export function ColorEditor({ draft, baseline, errors, onChange }: ColorEditorProps) {
  const theme = draft.theme
  const allValid = COLOR_TOKENS.every((t) => HEX_PATTERN.test(theme[t]))
  const setToken = (token: ColorToken, value: string) => onChange({ ...draft, theme: { ...theme, [token]: value } })

  return (
    <div className={styles.colorLayout}>
      <p className={styles.notice}>
        <Icon name="palette" />
        Somente as quatro cores da identidade podem ser alteradas. Cada cor é verificada quanto ao contraste
        (WCAG AA) e às famílias vetadas pela marca (vermelho, roxo, rosa e amarelo intenso). A identidade
        visual oficial do cliente prevalece.
      </p>

      <div className={styles.colorGrid}>
        {COLOR_TOKENS.map((token) => (
          <ColorField
            key={token}
            token={token}
            value={theme[token]}
            original={baseline.theme[token]}
            checks={allValid ? COLOR_RULES[token].check(theme) : []}
            error={errors.get(`theme.${token}`)}
            onChange={(value) => setToken(token, value)}
          />
        ))}
      </div>

      <section className={styles.card} aria-label="Amostra das cores">
        <h2 className={styles.cardTitle}>Amostra</h2>
        <div className={styles.swatchDemo} data-valid={allValid}>
          <SwatchPreview theme={theme} />
        </div>
      </section>
    </div>
  )
}

interface ColorFieldProps {
  token: ColorToken
  value: string
  original: string
  checks: { ok: boolean; message: string }[]
  error?: string
  onChange: (value: string) => void
}

function ColorField({ token, value, original, checks, error, onChange }: ColorFieldProps) {
  const id = useId()
  const rule = COLOR_RULES[token]
  const [text, setText] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  // Sincroniza o texto quando a cor muda por fora (seletor visual, restaurar), sem atrapalhar a digitação.
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== normalizeHex(text)) setText(value)
  }
  const valid = HEX_PATTERN.test(value)

  return (
    <section className={styles.card} aria-labelledby={`${id}-titulo`}>
      <div className={styles.fieldHead}>
        <h2 id={`${id}-titulo`} className={styles.cardTitle}>
          {rule.label}
          {value.toUpperCase() !== original.toUpperCase() && <span className={styles.modifiedTag}>alterada</span>}
        </h2>
        {value.toUpperCase() !== original.toUpperCase() && (
          <button type="button" className={styles.linkButton} onClick={() => onChange(original)}>
            <Icon name="undo" />
            Restaurar
          </button>
        )}
      </div>
      <p className={styles.cardText}>{rule.usage}</p>
      <div className={styles.colorInputs}>
        <input
          type="color"
          aria-label={`${rule.label}: seletor visual`}
          value={valid ? value : original}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className={styles.colorPicker}
        />
        <label className="sr-only" htmlFor={`${id}-hex`}>
          {rule.label}: código hexadecimal
        </label>
        <input
          id={`${id}-hex`}
          type="text"
          className={styles.input}
          value={text}
          maxLength={7}
          spellCheck={false}
          aria-invalid={Boolean(error) || !valid}
          aria-describedby={`${id}-checks`}
          onChange={(event) => {
            setText(event.target.value)
            onChange(normalizeHex(event.target.value))
          }}
        />
      </div>
      <ul id={`${id}-checks`} className={styles.checks}>
        {!valid && (
          <li data-ok="false">
            <Icon name="alert" />
            Use o formato #RRGGBB.
          </li>
        )}
        {checks.map((check) => (
          <li key={check.message} data-ok={check.ok}>
            <Icon name={check.ok ? 'check' : 'alert'} />
            {check.message}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Amostra renderizada com variáveis CSS aplicadas via CSSOM (compatível com a CSP). */
function SwatchPreview({ theme }: { theme: SiteContent['theme'] }) {
  const ref = (el: HTMLDivElement | null) => {
    if (!el) return
    if (!COLOR_TOKENS.every((t) => HEX_PATTERN.test(theme[t]))) return
    el.style.setProperty('--brand', theme.brand)
    el.style.setProperty('--brand-deep', theme.brandDeep)
    el.style.setProperty('--accent', theme.accent)
    el.style.setProperty('--surface-tint', theme.surfaceTint)
  }
  return (
    <div ref={ref} className={styles.swatch}>
      <div className={styles.swatchSurface}>
        <span className={styles.swatchEyebrow}>Especialidades</span>
        <p className={styles.swatchTitle}>Qual solução você procura?</p>
        <p className={styles.swatchText}>Texto de apoio sobre o fundo suave.</p>
        <span className={styles.swatchButtons}>
          <span className={styles.swatchPrimary}>Solicitar cotação</span>
          <span className={styles.swatchAccent}>Sob medida</span>
        </span>
      </div>
      <div className={styles.swatchDeep}>
        <p className={styles.swatchTitle}>Cartão escuro</p>
        <p>Texto claro sobre a cor profunda.</p>
      </div>
    </div>
  )
}
