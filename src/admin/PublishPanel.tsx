import { useState, type ChangeEvent } from 'react'
import { IMAGE_SLOTS } from '../content/images'
import { siteSchema, type SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import { parseImportedContent, serializeContent } from './draftStorage'
import type { Change } from './fields'
import {
  blobToBase64,
  describeGitHubError,
  utf8ToBase64,
  type FileToCommit,
  type GitHubClient,
  type WritablePath,
} from './github'
import type { ImageDrafts } from './ImageEditor'
import styles from './admin.module.css'

interface PublishPanelProps {
  draft: SiteContent
  errors: Map<string, string>
  changes: Change[]
  images: ImageDrafts
  client: GitHubClient
  baselineSha: string | null
  onPublished: (content: SiteContent, sha: string | null) => void
  onImport: (content: SiteContent) => void
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'deploying' }
  | { kind: 'live' }
  | { kind: 'slow' }
  | { kind: 'error'; message: string }

const DEPLOY_POLL_MS = 10_000
const DEPLOY_TIMEOUT_MS = 6 * 60_000

/** Aguarda o GitHub Pages servir o build do commit publicado (build-info.json gerado no deploy). */
async function waitForDeploy(commit: string): Promise<boolean> {
  const deadline = Date.now() + DEPLOY_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, DEPLOY_POLL_MS))
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}build-info.json?v=${Date.now()}`, { cache: 'no-store' })
      if (response.ok && ((await response.json()) as { commit?: string }).commit === commit) return true
    } catch {
      /* tenta de novo no próximo ciclo */
    }
  }
  return false
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PublishPanel({ draft, errors, changes, images, client, baselineSha, onPublished, onImport }: PublishPanelProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const valid = errors.size === 0
  const changedImages = IMAGE_SLOTS.filter((slot) => images[slot.id])
  const total = changes.length + changedImages.length
  const busy = phase.kind === 'sending'

  const publish = async () => {
    const parsed = siteSchema.safeParse(draft)
    if (!parsed.success || total === 0 || busy) return
    setPhase({ kind: 'sending' })
    try {
      const remote = await client.readFile('src/content/site.json')
      if (baselineSha && remote && remote.sha !== baselineSha) {
        throw new Error('O conteúdo do site foi alterado em outro acesso depois que você entrou. Saia, entre de novo e refaça a alteração.')
      }
      const files: FileToCommit[] = []
      if (changes.length > 0) files.push({ path: 'src/content/site.json', base64: utf8ToBase64(serializeContent(parsed.data)) })
      for (const slot of changedImages) {
        files.push({ path: `public/${slot.file}` as WritablePath, base64: await blobToBase64(images[slot.id]!.blob) })
      }
      const { commit, blobs } = await client.commitFiles(files, `Painel: atualização de conteúdo (${total} alteração(ões))`)
      onPublished(parsed.data, blobs['src/content/site.json'] ?? baselineSha)
      setPhase({ kind: 'deploying' })
      setPhase({ kind: (await waitForDeploy(commit)) ? 'live' : 'slow' })
    } catch (error) {
      setPhase({ kind: 'error', message: describeGitHubError(error) })
    }
  }

  const exportJson = () => {
    const parsed = siteSchema.safeParse(draft)
    if (parsed.success) download(new Blob([serializeContent(parsed.data)], { type: 'application/json' }), 'site.json')
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 200 * 1024) {
      setMessage({ kind: 'error', text: 'Arquivo grande demais para um site.json.' })
      return
    }
    const result = parseImportedContent(await file.text())
    if (result.ok) {
      onImport(result.content)
      setMessage({ kind: 'ok', text: 'Rascunho importado e validado.' })
    } else {
      setMessage({ kind: 'error', text: result.message })
    }
  }

  return (
    <div className={styles.publishLayout}>
      <section className={styles.card} aria-labelledby="pub-status">
        <h2 id="pub-status" className={styles.cardTitle}>
          Verificação
        </h2>
        {valid ? (
          <p className={styles.alertOk}>
            <Icon name="check" />
            Conteúdo válido: estrutura preservada, textos dentro dos limites e cores aprovadas.
          </p>
        ) : (
          <div className={styles.alertError} role="alert">
            <Icon name="alert" />
            <div>
              <p>Corrija os itens abaixo antes de publicar:</p>
              <ul className={styles.errorList}>
                {[...errors.entries()].map(([path, msg]) => (
                  <li key={path}>
                    <code>{path}</code> — {msg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="pub-changes">
        <h2 id="pub-changes" className={styles.cardTitle}>
          Alterações ({total})
        </h2>
        {total === 0 && <p className={styles.cardText}>Nenhuma alteração em relação ao site publicado.</p>}
        {total > 0 && (
          <ul className={styles.changeList}>
            {changes.map((change) => (
              <li key={change.key}>
                <strong>{change.label}</strong>
                <span className={styles.before}>
                  <span className="sr-only">Antes: </span>
                  {change.before}
                </span>
                <span className={styles.after}>
                  <span className="sr-only">Depois: </span>
                  {change.after}
                </span>
              </li>
            ))}
            {changedImages.map((slot) => (
              <li key={slot.id}>
                <strong>Imagem › {slot.label}</strong>
                <span className={styles.after}>Novo arquivo {slot.file}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card} aria-labelledby="pub-go">
        <h2 id="pub-go" className={styles.cardTitle}>
          Publicar
        </h2>
        <p className={styles.cardText}>
          As alterações são enviadas ao GitHub em uma única atualização. O site é revalidado e republicado
          automaticamente em cerca de 1 a 2 minutos.
        </p>
        <span className={styles.buttonRow}>
          <button type="button" className={styles.primaryButton} disabled={!valid || total === 0 || busy} onClick={publish}>
            <Icon name="upload" />
            {busy ? 'Enviando…' : 'Publicar no site'}
          </button>
        </span>
        <div role="status" aria-live="polite">
          {phase.kind === 'deploying' && (
            <p className={styles.alertWarn}>
              <Icon name="sparkle" />
              Salvo! Publicando no site… você pode continuar editando.
            </p>
          )}
          {phase.kind === 'live' && (
            <p className={styles.alertOk}>
              <Icon name="check" />
              Pronto: as alterações já estão no ar.
            </p>
          )}
          {phase.kind === 'slow' && (
            <p className={styles.alertWarn}>
              <Icon name="alert" />
              As alterações foram salvas, mas a publicação está demorando. Confira o site em alguns minutos; se não
              aparecer, avise quem mantém o site.
            </p>
          )}
        </div>
        {phase.kind === 'error' && (
          <p className={styles.alertError} role="alert">
            <Icon name="alert" />
            {phase.message}
          </p>
        )}
      </section>

      <details className={`${styles.card} ${styles.help}`}>
        <summary>Cópia de segurança do conteúdo</summary>
        <p className={styles.cardText}>Baixe o conteúdo atual do rascunho ou retome um arquivo baixado anteriormente.</p>
        <span className={styles.buttonRow}>
          <button type="button" className={styles.ghostButton} disabled={!valid} onClick={exportJson}>
            <Icon name="download" />
            Baixar site.json
          </button>
          <label className={styles.uploadButton}>
            <Icon name="upload" />
            Importar site.json
            <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
          </label>
        </span>
        <div role="status" aria-live="polite">
          {message && <p className={message.kind === 'ok' ? styles.alertOk : styles.alertError}>{message.text}</p>}
        </div>
      </details>
    </div>
  )
}
