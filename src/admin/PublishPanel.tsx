import { useState, type ChangeEvent } from 'react'
import { IMAGE_SLOTS } from '../content/images'
import { siteSchema, type Settings, type SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import { parseImportedContent, serializeContent } from './draftStorage'
import type { Change } from './fields'
import type { ImageDrafts } from './ImageEditor'
import styles from './admin.module.css'

interface PublishPanelProps {
  draft: SiteContent
  errors: Map<string, string>
  changes: Change[]
  images: ImageDrafts
  settings: Settings
  onImport: (content: SiteContent) => void
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

/*
 * Fluxo seguro de publicação, sem credenciais no frontend:
 * o painel exporta arquivos validados; a gravação acontece no GitHub, com a conta
 * autorizada do responsável, por meio de um Pull Request que passa pelo CI.
 */
export function PublishPanel({ draft, errors, changes, images, settings, onImport }: PublishPanelProps) {
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const valid = errors.size === 0
  const changedImages = IMAGE_SLOTS.filter((slot) => images[slot.id])
  const hasChanges = changes.length > 0 || changedImages.length > 0
  const repo = settings.repository
  const githubEdit = repo ? `https://github.com/${repo}/edit/${settings.branch}/src/content/site.json` : null
  const githubUpload = repo ? `https://github.com/${repo}/upload/${settings.branch}/public/images` : null

  const exportJson = () => {
    const parsed = siteSchema.safeParse(draft)
    if (!parsed.success) return
    download(new Blob([serializeContent(parsed.data)], { type: 'application/json' }), 'site.json')
  }

  const copyJson = async () => {
    const parsed = siteSchema.safeParse(draft)
    if (!parsed.success) return
    try {
      await navigator.clipboard.writeText(serializeContent(parsed.data))
      setMessage({ kind: 'ok', text: 'Conteúdo copiado. Cole-o no editor do GitHub substituindo todo o arquivo.' })
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível copiar. Use “Baixar site.json”.' })
    }
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
              <p>Corrija os itens abaixo antes de exportar:</p>
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
          Alterações ({changes.length + changedImages.length})
        </h2>
        {!hasChanges && <p className={styles.cardText}>Nenhuma alteração em relação ao site publicado.</p>}
        {hasChanges && (
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

      <section className={styles.card} aria-labelledby="pub-steps">
        <h2 id="pub-steps" className={styles.cardTitle}>
          Publicar com segurança
        </h2>
        <p className={styles.cardText}>
          Este painel não possui senha nem grava no site diretamente. A publicação acontece no GitHub, com a sua
          conta autorizada, por meio de um Pull Request validado automaticamente.
        </p>
        <ol className={styles.steps}>
          <li>
            <strong>Exporte o conteúdo</strong>
            <span className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} disabled={!valid || changes.length === 0} onClick={exportJson}>
                <Icon name="download" />
                Baixar site.json
              </button>
              <button type="button" className={styles.ghostButton} disabled={!valid || changes.length === 0} onClick={copyJson}>
                <Icon name="copy" />
                Copiar conteúdo
              </button>
            </span>
            {changedImages.length > 0 && (
              <span className={styles.buttonRow}>
                {changedImages.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => download(images[slot.id]!.blob, slot.file.split('/').pop()!)}
                  >
                    <Icon name="download" />
                    Baixar {slot.file.split('/').pop()}
                  </button>
                ))}
              </span>
            )}
          </li>
          <li>
            <strong>Envie pelo GitHub</strong>
            {repo ? (
              <span className={styles.buttonRow}>
                {changes.length > 0 && (
                  <a className={styles.ghostButton} href={githubEdit!} target="_blank" rel="noopener noreferrer">
                    Editar src/content/site.json
                    <Icon name="arrowUpRight" />
                  </a>
                )}
                {changedImages.length > 0 && (
                  <a className={styles.ghostButton} href={githubUpload!} target="_blank" rel="noopener noreferrer">
                    Enviar imagens para public/images
                    <Icon name="arrowUpRight" />
                  </a>
                )}
              </span>
            ) : (
              <span className={styles.cardText}>
                O repositório ainda não foi configurado em <code>src/content/settings.json</code>. Envie os arquivos
                exportados ao responsável técnico.
              </span>
            )}
            <span className={styles.cardText}>
              Substitua o arquivo inteiro (mesmo nome) e, ao salvar, escolha “Create a new branch for this commit and
              start a pull request”.
            </span>
          </li>
          <li>
            <strong>Revise e aprove</strong>
            <span className={styles.cardText}>
              O CI valida o schema, as imagens e o build. Após aprovação e merge na branch principal, o GitHub Pages
              publica o site automaticamente.
            </span>
          </li>
        </ol>
      </section>

      <section className={styles.card} aria-labelledby="pub-import">
        <h2 id="pub-import" className={styles.cardTitle}>
          Retomar um rascunho
        </h2>
        <p className={styles.cardText}>Carregue um site.json exportado anteriormente. O arquivo precisa seguir o formato fechado.</p>
        <label className={styles.uploadButton}>
          <Icon name="upload" />
          Importar site.json
          <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
        </label>
      </section>

      <div role="status" aria-live="polite">
        {message && <p className={message.kind === 'ok' ? styles.alertOk : styles.alertError}>{message.text}</p>}
      </div>
    </div>
  )
}
