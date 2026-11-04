import { useId, useState, type FormEvent } from 'react'
import { Icon } from '../site/components/Icon'
import { passwordProblem } from './access'
import type { AdminSession } from './AccessGate'
import { describeGitHubError } from './github'
import styles from './admin.module.css'

export function AccessPanel({ session, onLogout }: { session: AdminSession; onLogout: () => void }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const problem = passwordProblem(password) ?? (password !== confirm ? 'As senhas não conferem.' : null)
    if (problem) {
      setResult({ ok: false, text: problem })
      return
    }
    setBusy(true)
    setResult(null)
    try {
      await session.changePassword(password)
      setPassword('')
      setConfirm('')
      setResult({ ok: true, text: 'Senha trocada. Use a nova senha no próximo acesso.' })
    } catch (error) {
      setResult({ ok: false, text: describeGitHubError(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.publishLayout}>
      <section className={styles.card} aria-labelledby={`${id}-titulo`}>
        <h2 id={`${id}-titulo`} className={styles.cardTitle}>
          Trocar a senha do painel
        </h2>
        <form className={styles.fieldList} onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor={`${id}-nova`}>Nova senha</label>
            <input
              id={`${id}-nova`}
              type="password"
              className={styles.input}
              autoComplete="new-password"
              value={password}
              aria-describedby={`${id}-regra`}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p id={`${id}-regra`} className={styles.counter}>
              Mínimo de 12 caracteres. Prefira uma frase longa.
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-confirma`}>Confirmar nova senha</label>
            <input
              id={`${id}-confirma`}
              type="password"
              className={styles.input}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <span className={styles.buttonRow}>
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              <Icon name="lock" />
              {busy ? 'Salvando…' : 'Trocar senha'}
            </button>
          </span>
          <div role="status" aria-live="polite">
            {result && (
              <p className={result.ok ? styles.alertOk : styles.alertError}>
                <Icon name={result.ok ? 'check' : 'alert'} />
                {result.text}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className={styles.card} aria-labelledby={`${id}-sessao`}>
        <h2 id={`${id}-sessao`} className={styles.cardTitle}>
          Sessão
        </h2>
        <p className={styles.cardText}>
          A chave de acesso fica apenas na memória desta aba e é descartada ao sair ou fechar o navegador. Se a chave
          do GitHub expirar, quem mantém o site deve usar “Reconfigurar acesso” na tela de entrada.
        </p>
        <span className={styles.buttonRow}>
          <button type="button" className={styles.ghostButton} onClick={onLogout}>
            Sair do painel
          </button>
        </span>
      </section>
    </div>
  )
}
