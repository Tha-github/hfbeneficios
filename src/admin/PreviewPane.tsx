import { useCallback, useEffect, useRef, useState } from 'react'
import type { SiteContent } from '../content/schema'
import { Icon, type IconName } from '../site/components/Icon'
import { PREVIEW_MESSAGE, PREVIEW_READY } from '../site/preview'
import type { ImageDrafts } from './ImageEditor'
import styles from './admin.module.css'

const DEVICES: { id: string; label: string; width: number; icon: IconName }[] = [
  { id: 'mobile', label: 'Celular', width: 390, icon: 'phone' },
  { id: 'tablet', label: 'Tablet', width: 768, icon: 'tablet' },
  { id: 'desktop', label: 'Computador', width: 1280, icon: 'monitor' },
]

/**
 * Prévia real do site em um iframe da mesma origem. O rascunho é enviado por postMessage
 * e validado pelo próprio site antes de ser exibido.
 */
export function PreviewPane({ draft, images }: { draft: SiteContent; images: ImageDrafts }) {
  const [device, setDevice] = useState(DEVICES[2])
  const [scale, setScale] = useState(1)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE, content: draft, images: { about: images.about?.url } },
      window.location.origin,
    )
  }, [draft, images])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if ((event.data as { type?: string })?.type === PREVIEW_READY) send()
    }
    window.addEventListener('message', onMessage)
    send()
    return () => window.removeEventListener('message', onMessage)
  }, [send])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / device.width)))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [device])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    frame.style.width = `${device.width}px`
    frame.style.transform = `scale(${scale})`
    frame.parentElement!.style.height = `${Math.round(860 * scale)}px`
  }, [device, scale])

  return (
    <div className={styles.previewLayout}>
      <div className={styles.previewToolbar}>
        <div role="group" aria-label="Tamanho da tela" className={styles.segmented}>
          {DEVICES.map((d) => (
            <button key={d.id} type="button" aria-pressed={device.id === d.id} onClick={() => setDevice(d)}>
              <Icon name={d.icon} />
              {d.label}
            </button>
          ))}
        </div>
        <span className={styles.counter}>
          {device.width}px · rascunho não publicado
        </span>
      </div>
      <div ref={stageRef} className={styles.previewStage}>
        <div className={styles.previewViewport}>
          <iframe
            ref={frameRef}
            title="Pré-visualização do site com as alterações do rascunho"
            src={`${import.meta.env.BASE_URL}?preview=1`}
            className={styles.previewFrame}
            onLoad={send}
          />
        </div>
      </div>
    </div>
  )
}
