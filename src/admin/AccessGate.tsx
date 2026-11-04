import { useEffect, useId, useState, type FormEvent } from 'react'
import { publishedContent, settings } from '../content'
import { siteSchema, type SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import { Logo } from '../site/components/Logo'
import {
  ACCESS_FILE_PATH,
  accessFileSchema,
  decryptToken,
  encryptToken,
  passwordProblem,
  tokenProblem,
  type AccessFile,
} from './access'
import { AdminApp } from './AdminApp'
import { createGitHubClient, describeGitHubError, utf8ToBase64, type GitHubClient } from './github'
import styles from './admin.module.css'

export interface AdminSession {
  client: GitHubClient
  /** Conteúdo publicado no repositório no momento do login. */
  baseline: SiteContent
  baselineSha: string | null
  changePassword: (password: string) => Promise<void>
  logout: () => void
}

type Stage =
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'setup'; file: AccessFile | null }
  | { kind: 'login'; file: AccessFile }
  | { kind: 'ready'; session: AdminSession }

const repository = settings.repository
const branch = settings.branch

/** Lê o arquivo cifrado: primeiro pela API pública (sem atraso de deploy), depois pelo próprio site. */
async function loadAccessFile(): Promise<AccessFile | null> {
  let text: string | null = null
  try {
    text = (await createGitHubClient(null, repository, branch).readFile(ACCESS_FILE_PATH))?.text ?? null
  } catch {
    /* API indisponível ou limite de requisições: usa a cópia publicada no site */
  }
  if (text === null) {
    const response = await fetch(`${import.meta.env.BASE_URL}admin/acesso.json?v=${Date.now()}`, { cache: 'no-store' })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Não foi possível carregar a configuração de acesso.')
    text = await response.text()
    // Alguns servidores respondem com a página HTML em vez de 404 quando o arquivo não existe.
    if (text.trimStart().startsWith('<')) return null
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }
  const parsed = accessFileSchema.safeParse(data)
  if (!parsed.success) throw new Error('O arquivo de acesso está corrompido. Peça a quem mantém o site para reconfigurar o acesso.')
  return parsed.data
}

async function openSession(token: string, onLogout: () => void): Promise<AdminSession> {
  const client = createGitHubClient(token, repository, branch)
  await client.verify()
  const remote = await client.readFile('src/content/site.json')
  const parsed = remote ? siteSchema.safeParse(JSON.parse(remote.text)) : null
  return {
    client,
    baseline: parsed?.success ? (JSON.parse(remote!.text) as SiteContent) : publishedContent,
    baselineSha: parsed?.success ? remote!.sha : null,
    async changePassword(password) {
      const file = await encryptToken(token, password, repository)
      await client.commitFiles(
        [{ path: ACCESS_FILE_PATH, base64: utf8ToBase64(`${JSON.stringify(file, null, 2)}\n`) }],
        'Painel: troca de senha',
      )
    },
    logout: onLogout,
  }
}

function environmentProblem(): string | null {
  if (!repository) return 'O repositório do site não está configurado (settings.json › repository).'
  if (!globalThis.crypto?.subtle) {
    return 'Este navegador não oferece criptografia segura. Use Chrome, Edge, Firefox ou Safari atualizados.'
  }
  return null
}

export function AccessGate() {
  const [problem] = useState(environmentProblem)
  const [stage, setStage] = useState<Stage>(problem ? { kind: 'unavailable', message: problem } : { kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (problem) return
    let active = true
    loadAccessFile()
      .then((file) => active && setStage(file ? { kind: 'login', file } : { kind: 'setup', file: null }))
      .catch((error: Error) => active && setStage({ kind: 'unavailable', message: error.message }))
    return () => {
      active = false
    }
  }, [attempt, problem])

  const restart = () => {
    setStage({ kind: 'loading' })
    setAttempt((n) => n + 1)
  }
  const logout = restart

  if (stage.kind === 'ready') return <AdminApp session={stage.session} />

  return (
    <div className={styles.gate}>
      <main className={styles.gateCard} aria-labelledby="gate-title">
        <Logo />
        {stage.kind === 'loading' && (
          <p className={styles.cardText} role="status">
            Carregando…
          </p>
        )}
        {stage.kind === 'unavailable' && (
          <>
            <h1 id="gate-title" className={styles.gateTitle}>
              Painel indisponível
            </h1>
            <p className={styles.alertError} role="alert">
              <Icon name="alert" />
              {stage.message}
            </p>
            {!problem && (
              <button type="button" className={styles.ghostButton} onClick={restart}>
                Tentar novamente
              </button>
            )}
          </>
        )}
        {stage.kind === 'login' && (
          <LoginForm
            file={stage.file}
            onSession={(session) => setStage({ kind: 'ready', session })}
            onReconfigure={() => setStage({ kind: 'setup', file: stage.file })}
            onLogout={logout}
          />
        )}
        {stage.kind === 'setup' && (
          <SetupForm
            canCancel={stage.file !== null}
            onCancel={() => stage.file && setStage({ kind: 'login', file: stage.file })}
            onSession={(session) => setStage({ kind: 'ready', session })}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  )
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  describedBy,
  invalid,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  describedBy?: string
  invalid?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordRow}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          value={value}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className={styles.toggleButton} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          <Icon name="eye" />
          <span className="sr-only">{visible ? 'Ocultar' : 'Mostrar'} {label.toLowerCase()}</span>
        </button>
      </div>
    </div>
  )
}

function LoginForm({
  file,
  onSession,
  onReconfigure,
  onLogout,
}: {
  file: AccessFile
  onSession: (session: AdminSession) => void
  onReconfigure: () => void
  onLogout: () => void
}) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!password) {
      setError('Digite a senha.')
      return
    }
    setBusy(true)
    setError(null)
    const token = await decryptToken(file, password, repository)
    if (!token) {
      setBusy(false)
      setError('Senha incorreta.')
      return
    }
    try {
      onSession(await openSession(token, onLogout))
    } catch (err) {
      setBusy(false)
      setError(describeGitHubError(err))
    }
  }

  return (
    <form className={styles.gateForm} onSubmit={onSubmit} noValidate>
      <h1 id="gate-title" className={styles.gateTitle}>
        Entrar no painel
      </h1>
      <p className={styles.cardText}>Digite a senha do painel de conteúdo.</p>
      <PasswordInput
        id={`${id}-senha`}
        label="Senha"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        invalid={Boolean(error)}
        describedBy={error ? `${id}-erro` : undefined}
      />
      {error && (
        <p id={`${id}-erro`} className={styles.alertError} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      <button type="submit" className={styles.primaryButton} disabled={busy}>
        <Icon name="lock" />
        {busy ? 'Verificando…' : 'Entrar'}
      </button>
      <button type="button" className={styles.linkButton} onClick={onReconfigure}>
        Reconfigurar acesso (nova chave do GitHub)
      </button>
    </form>
  )
}

function SetupForm({
  canCancel,
  onCancel,
  onSession,
  onLogout,
}: {
  canCancel: boolean
  onCancel: () => void
  onSession: (session: AdminSession) => void
  onLogout: () => void
}) {
  const id = useId()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const problem =
      tokenProblem(token.trim()) ?? passwordProblem(password) ?? (password !== confirm ? 'As senhas não conferem.' : null)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const candidate = token.trim()
      const client = createGitHubClient(candidate, repository, branch)
      await client.verify()
      const file = await encryptToken(candidate, password, repository)
      await client.commitFiles(
        [{ path: ACCESS_FILE_PATH, base64: utf8ToBase64(`${JSON.stringify(file, null, 2)}\n`) }],
        'Painel: configuração de acesso',
      )
      onSession(await openSession(candidate, onLogout))
    } catch (err) {
      setBusy(false)
      setError(describeGitHubError(err))
    }
  }

  return (
    <form className={styles.gateForm} onSubmit={onSubmit} noValidate>
      <h1 id="gate-title" className={styles.gateTitle}>
        Configurar o acesso
      </h1>
      <p className={styles.cardText}>
        Feito uma vez por quem mantém o site. A chave do GitHub fica guardada no site cifrada com a senha definida
        aqui; depois disso, a cliente entra apenas com a senha.
      </p>
      <details className={styles.help}>
        <summary>Como criar a chave do GitHub</summary>
        <ol>
          <li>GitHub › Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token.</li>
          <li>Repository access: Only select repositories › {repository}.</li>
          <li>Repository permissions › Contents: Read and write. Nenhuma outra permissão.</li>
          <li>Anote a data de expiração; ao vencer, volte aqui em “Reconfigurar acesso”.</li>
        </ol>
      </details>
      <PasswordInput id={`${id}-token`} label="Chave de acesso do GitHub" value={token} onChange={setToken} autoComplete="off" />
      <PasswordInput
        id={`${id}-senha`}
        label="Nova senha do painel"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        describedBy={`${id}-regra`}
      />
      <p id={`${id}-regra`} className={styles.counter}>
        Mínimo de 12 caracteres. Prefira uma frase longa: o arquivo cifrado é público.
      </p>
      <PasswordInput id={`${id}-confirma`} label="Confirmar senha" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error && (
        <p className={styles.alertError} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      <button type="submit" className={styles.primaryButton} disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar e entrar'}
      </button>
      {canCancel && (
        <button type="button" className={styles.linkButton} onClick={onCancel}>
          Voltar para o login
        </button>
      )}
    </form>
  )
}
