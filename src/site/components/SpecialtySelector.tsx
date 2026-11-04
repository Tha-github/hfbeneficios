import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { SiteContent } from '../../content/schema'
import { SERVICE_IDS, type ServiceId } from '../../content/schema-ids'
import { SERVICE_ICONS } from '../lib/icons'
import { useQuote } from '../lib/quote'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './SpecialtySelector.module.css'

interface SelectorProps {
  content: SiteContent['selector']
  services: SiteContent['services']['items']
}

const isServiceId = (value: string): value is ServiceId => (SERVICE_IDS as readonly string[]).includes(value)

export function SpecialtySelector({ content, services }: SelectorProps) {
  const [selected, setSelected] = useState<ServiceId>(services[0].id)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const sectionRef = useRef<HTMLElement>(null)
  const { requestQuote } = useQuote()

  // Links diretos como #seguros-agricolas abrem a especialidade correspondente.
  useEffect(() => {
    const syncFromHash = (scroll: boolean) => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!isServiceId(id)) return
      setSelected(id)
      if (scroll) requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start' }))
    }
    syncFromHash(true)
    const onHash = () => syncFromHash(true)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const focusTab = (index: number) => {
    const service = services[(index + services.length) % services.length]
    setSelected(service.id)
    tabRefs.current[service.id]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: services.length - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    focusTab(keys[event.key])
  }

  return (
    <section ref={sectionRef} id="solucoes" className={ui.section} aria-labelledby="solucoes-title">
      <div className={ui.container}>
        <div className={ui.sectionHeadSplit}>
          <p className={ui.eyebrow}>{content.eyebrow}</p>
          <h2 id="solucoes-title" className={ui.title}>
            {content.title}
          </h2>
          <p className={ui.lead}>{content.description}</p>
        </div>

        <div className={styles.tablist} role="tablist" aria-label={content.title}>
          {services.map((service, index) => {
            const active = service.id === selected
            return (
              <button
                key={service.id}
                ref={(el) => {
                  tabRefs.current[service.id] = el
                }}
                id={`aba-${service.id}`}
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={active}
                aria-controls={service.id}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(service.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <span className={styles.tabTop}>
                  <span className={styles.tabIcon}>
                    <Icon name={SERVICE_ICONS[service.id]} />
                  </span>
                  <span className={styles.tabIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <span className={styles.tabName}>{service.name}</span>
                <span className={styles.tabTag}>{service.tag}</span>
                <span className={styles.tabArrow} aria-hidden="true">
                  <Icon name="arrowRight" />
                </span>
              </button>
            )
          })}
        </div>

        {services.map((service) => (
          <div
            key={service.id}
            id={service.id}
            role="tabpanel"
            aria-labelledby={`aba-${service.id}`}
            hidden={service.id !== selected}
            tabIndex={0}
            className={styles.panel}
          >
            <div className={styles.detail}>
              <span className={styles.detailIcon}>
                <Icon name={SERVICE_ICONS[service.id]} />
              </span>
              <h3 className={styles.detailTitle}>{service.name}</h3>
              <p className={styles.detailSummary}>{service.summary}</p>
              <ul className={styles.highlights}>
                {service.highlights.map((item) => (
                  <li key={item}>
                    <span className={styles.check}>
                      <Icon name="check" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a className={ui.primary} href="#contato" onClick={() => requestQuote({ specialty: service.id })}>
                {service.ctaLabel}
                <Icon name="arrowRight" />
              </a>
            </div>

            <div className={styles.flow}>
              <p className={styles.flowTitle}>{content.stepsTitle}</p>
              <ol className={styles.steps}>
                {content.steps.map((step, index) => (
                  <li key={step.title}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>
                      <strong>{step.title}</strong>
                      <span>{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className={styles.request} aria-hidden="true">
                <span className={styles.requestLabel}>{content.requestLabel}</span>
                <span className={styles.requestValue}>
                  <Icon name={SERVICE_ICONS[service.id]} />
                  {service.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
