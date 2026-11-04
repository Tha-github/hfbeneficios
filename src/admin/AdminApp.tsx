import { useEffect, useMemo, useRef, useState } from 'react'
import type { SiteContent } from '../content/schema'
import { Icon, type IconName } from '../site/components/Icon'
import { Logo } from '../site/components/Logo'
import type { AdminSession } from './AccessGate'
import { AccessPanel } from './AccessPanel'
import { ColorEditor } from './ColorEditor'
import { clearDraft, loadDraft, saveDraft } from './draftStorage'
import { diffContent, validationErrors } from './fields'
import { ImageEditor, type ImageDrafts } from './ImageEditor'
import { PreviewPane } from './PreviewPane'
import { PublishPanel } from './PublishPanel'
import { TextEditor } from './TextEditor'
import styles from './admin.module.css'

type View = 'texts' | 'images' | 'colors' | 'preview' | 'publish' | 'access'

const VIEWS: { id: View; label: string; icon: IconName }[] = [
  { id: 'texts', label: 'Textos', icon: 'text' },
  { id: 'images', label: 'Imagens', icon: 'image' },
  { id: 'colors', label: 'Cores', icon: 'palette' },
  { id: 'preview', label: 'Pré-visualização', icon: 'eye' },
  { id: 'publish', label: 'Publicar', icon: 'upload' },
  { id: 'access', label: 'Acesso', icon: 'lock' },
]

export function AdminApp({ session }: { session: AdminSession }) {
  const [baseline, setBaseline] = useState<SiteContent>(session.baseline)
  const [baselineSha, setBaselineSha] = useState(session.baselineSha)
  const [initial] = useState(() => loadDraft())
  const [draft, setDraft] = useState<SiteContent>(initial?.content ?? session.baseline)
  const [savedAt, setSavedAt] = useState<string | null>(initial?.savedAt ?? null)
  const [images, setImages] = useState<ImageDrafts>({})
  const [view, setView] = useState<View>('texts')
  const headingRef = useRef<HTMLHeadingElement>(null)

  const changes = useMemo(() => diffContent(baseline, draft), [baseline, draft])
  const errors = useMemo(() => validationErrors(draft), [draft])
  const imageChanges = Object.keys(images).length
  const totalChanges = changes.length + imageChanges

  // Salva o rascunho localmente a cada alteração (conveniência, não publicação).
  const updateDraft = (next: SiteContent) => {
    setDraft(next)
    if (diffContent(baseline, next).length === 0) {
      clearDraft()
      setSavedAt(null)
    } else {
      setSavedAt(saveDraft(next))
    }
  }

  // Avisa antes de sair com imagens não publicadas (elas não ficam no rascunho local).
  useEffect(() => {
    if (imageChanges === 0) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [imageChanges])

  const go = (next: View) => {
    setView(next)
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const resetImages = () => {
    for (const image of Object.values(images)) if (image) URL.revokeObjectURL(image.url)
    setImages({})
  }

  const discardAll = () => {
    resetImages()
    updateDraft(baseline)
  }

  /** Após publicar, o rascunho vira a nova referência. */
  const onPublished = (content: SiteContent, sha: string | null) => {
    setBaseline(content)
    if (sha) setBaselineSha(sha)
    setDraft(content)
    clearDraft()
    setSavedAt(null)
    resetImages()
  }

  const logout = () => {
    resetImages()
    session.logout()
  }

  const current = VIEWS.find((v) => v.id === view)!

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#painel-conteudo">
        Pular para o conteúdo
      </a>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Logo tone="light" />
          <span className={styles.sidebarTag}>Painel de conteúdo</span>
        </div>

        <nav aria-label="Seções do painel" className={styles.nav}>
          <ul>
            {VIEWS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.navItem}
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => go(item.id)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.id === 'publish' && totalChanges > 0 && (
                    <span className={styles.badge} aria-label={`${totalChanges} alterações`}>
                      {totalChanges}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFoot}>
          <p className={styles.draftStatus} role="status">
            {totalChanges === 0
              ? 'Nenhuma alteração pendente.'
              : `${totalChanges} alteração(ões) não publicada(s).`}
            {savedAt && changes.length > 0 && (
              <span>
                Rascunho guardado neste navegador às{' '}
                {new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
              </span>
            )}
          </p>
          <a className={styles.siteLink} href={import.meta.env.BASE_URL} target="_blank" rel="noopener">
            Ver site publicado
            <Icon name="arrowUpRight" />
          </a>
          <button type="button" className={styles.logoutButton} onClick={logout}>
            Sair do painel
          </button>
        </div>
      </aside>

      <main id="painel-conteudo" className={styles.main}>
        <header className={styles.mainHead}>
          <div>
            <h1 ref={headingRef} tabIndex={-1} className={styles.mainTitle}>
              {current.label}
            </h1>
            <p className={styles.mainHint}>
              Edite somente o conteúdo existente. A estrutura do site, as seções e os itens são fixos.
            </p>
          </div>
          {totalChanges > 0 && (
            <div className={styles.headActions}>
              <button type="button" className={styles.ghostButton} onClick={discardAll}>
                <Icon name="undo" />
                Descartar alterações
              </button>
              {view !== 'publish' && (
                <button type="button" className={styles.primaryButton} onClick={() => go('publish')}>
                  Revisar e publicar
                  <Icon name="arrowRight" />
                </button>
              )}
            </div>
          )}
        </header>

        {view === 'texts' && <TextEditor draft={draft} baseline={baseline} errors={errors} onChange={updateDraft} />}
        {view === 'images' && (
          <ImageEditor
            draft={draft}
            baseline={baseline}
            errors={errors}
            images={images}
            onImages={setImages}
            onChange={updateDraft}
          />
        )}
        {view === 'colors' && <ColorEditor draft={draft} baseline={baseline} errors={errors} onChange={updateDraft} />}
        {view === 'preview' && <PreviewPane draft={draft} images={images} />}
        {view === 'publish' && (
          <PublishPanel
            draft={draft}
            errors={errors}
            changes={changes}
            images={images}
            client={session.client}
            baselineSha={baselineSha}
            onPublished={onPublished}
            onImport={updateDraft}
          />
        )}
        {view === 'access' && <AccessPanel session={session} onLogout={logout} />}
      </main>
    </div>
  )
}
