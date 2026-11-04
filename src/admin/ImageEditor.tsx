import { useId, useState, type ChangeEvent } from 'react'
import { assetUrl, publishedContent } from '../content'
import { IMAGE_SLOTS, type ImageSlot } from '../content/images'
import type { SiteContent } from '../content/schema'
import { Icon } from '../site/components/Icon'
import { maxLengthAt, setText } from './fields'
import { processUpload, type ProcessedImage } from './imageProcessing'
import { TextInput } from './TextEditor'
import styles from './admin.module.css'

export type ImageDrafts = Partial<Record<ImageSlot['id'], ProcessedImage>>

interface ImageEditorProps {
  draft: SiteContent
  errors: Map<string, string>
  images: ImageDrafts
  onImages: (update: (current: ImageDrafts) => ImageDrafts) => void
  onChange: (next: SiteContent) => void
}

const ALT_PATHS: Record<ImageSlot['id'], ['about', 'image', 'alt'] | ['meta', 'ogImageAlt']> = {
  about: ['about', 'image', 'alt'],
  og: ['meta', 'ogImageAlt'],
}

export function ImageEditor({ draft, errors, images, onImages, onChange }: ImageEditorProps) {
  return (
    <div className={styles.imageGrid}>
      {IMAGE_SLOTS.map((slot) => {
        const altPath = ALT_PATHS[slot.id]
        const altValue = altPath[0] === 'about' ? draft.about.image.alt : draft.meta.ogImageAlt
        const altOriginal = altPath[0] === 'about' ? publishedContent.about.image.alt : publishedContent.meta.ogImageAlt
        return (
          <ImageSlotCard
            key={slot.id}
            slot={slot}
            current={images[slot.id]}
            onProcessed={(image) =>
              onImages((prev) => {
                const old = prev[slot.id]
                if (old) URL.revokeObjectURL(old.url)
                const next = { ...prev }
                if (image) next[slot.id] = image
                else delete next[slot.id]
                return next
              })
            }
          >
            <TextInput
              field={{
                path: altPath,
                key: altPath.join('.'),
                section: altPath[0],
                group: '',
                label: 'Texto alternativo (descrição da imagem para acessibilidade e SEO)',
                max: maxLengthAt(altPath),
                multiline: false,
              }}
              value={altValue}
              original={altOriginal}
              error={errors.get(altPath.join('.'))}
              onChange={(value) => onChange(setText(draft, altPath, value))}
            />
          </ImageSlotCard>
        )
      })}
    </div>
  )
}

interface SlotCardProps {
  slot: ImageSlot
  current?: ProcessedImage
  onProcessed: (image: ProcessedImage | null) => void
  children: React.ReactNode
}

function ImageSlotCard({ slot, current, onProcessed, children }: SlotCardProps) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onProcessed(await processUpload(file, slot))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className={styles.cardTitle}>
        {slot.label}
        {current && <span className={styles.modifiedTag}>substituída</span>}
      </h2>
      <p className={styles.cardText}>{slot.description}</p>

      <div className={styles.imageCompare}>
        <figure>
          <img src={assetUrl(slot.file)} alt="" width={slot.width} height={slot.height} />
          <figcaption>Publicada</figcaption>
        </figure>
        {current && (
          <figure>
            <img src={current.url} alt="" width={slot.width} height={slot.height} />
            <figcaption>Nova ({(current.blob.size / 1024).toFixed(0)} KB)</figcaption>
          </figure>
        )}
      </div>

      <dl className={styles.specs}>
        <div>
          <dt>Arquivo</dt>
          <dd>{slot.file}</dd>
        </div>
        <div>
          <dt>Saída</dt>
          <dd>
            {slot.width}×{slot.height}, {slot.mime === 'image/webp' ? 'WebP' : 'JPEG'}, até {slot.maxBytes / 1024} KB
          </dd>
        </div>
      </dl>

      <div className={styles.uploadRow}>
        <label className={styles.uploadButton} aria-disabled={busy}>
          <Icon name="upload" />
          {busy ? 'Processando…' : current ? 'Escolher outra imagem' : 'Substituir imagem'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            aria-describedby={`${id}-ajuda`}
            onChange={onFile}
          />
        </label>
        {current && (
          <button type="button" className={styles.linkButton} onClick={() => onProcessed(null)}>
            <Icon name="undo" />
            Manter a imagem publicada
          </button>
        )}
      </div>
      <p id={`${id}-ajuda`} className={styles.counter}>
        JPG, PNG ou WebP de até 10 MB. A imagem é recortada e convertida automaticamente.
      </p>

      {error && (
        <p className={styles.alertError} role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      {current?.warnings.map((warning) => (
        <p key={warning} className={styles.alertWarn}>
          <Icon name="alert" />
          {warning}
        </p>
      ))}

      {children}
    </section>
  )
}
