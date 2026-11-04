import type { SiteContent } from '../../content/schema'
import { DIFFERENTIAL_ICONS, SERVICE_ICONS } from '../lib/icons'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './Differentials.module.css'

interface DifferentialsProps {
  content: SiteContent['differentials']
  services: SiteContent['services']['items']
}

/** Variações visuais por posição: a estrutura é fixa (8 itens), a hierarquia é intencionalmente irregular. */
const VARIANTS = ['wide', 'feature', 'plain', 'plain', 'plain', 'plain', 'brand', 'deep'] as const

export function Differentials({ content, services }: DifferentialsProps) {
  return (
    <section id="diferenciais" className={ui.section} aria-labelledby="diferenciais-title">
      <div className={ui.container}>
        <div className={ui.sectionHeadSplit}>
          <p className={ui.eyebrow}>{content.eyebrow}</p>
          <h2 id="diferenciais-title" className={ui.title}>
            {content.title}
          </h2>
          <p className={ui.lead}>{content.description}</p>
        </div>

        <ul className={styles.bento}>
          {content.items.map((item, index) => {
            const variant = VARIANTS[index]
            return (
              <li key={item.title} className={`${styles.card} ${styles[variant]}`}>
                {variant === 'feature' ? (
                  <span className={styles.value} aria-hidden="true">
                    {content.highlightValue}
                  </span>
                ) : (
                  <span className={styles.icon} aria-hidden="true">
                    <Icon name={DIFFERENTIAL_ICONS[index]} />
                  </span>
                )}
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.text}</p>

                {variant === 'wide' && (
                  <span className={styles.chips} aria-hidden="true">
                    {services.map((service) => (
                      <span key={service.id}>
                        <Icon name={SERVICE_ICONS[service.id]} />
                        {service.name}
                      </span>
                    ))}
                  </span>
                )}
                {variant === 'feature' && <span className={styles.tiles} aria-hidden="true" />}
                {variant === 'deep' && <span className={styles.dots} aria-hidden="true" />}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
