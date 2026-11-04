import type { SiteContent } from '../../content/schema'
import { AUDIENCE_ICONS } from '../lib/icons'
import { useQuote } from '../lib/quote'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './Audiences.module.css'

interface AudiencesProps {
  content: SiteContent['audiences']
}

export function Audiences({ content }: AudiencesProps) {
  const { requestQuote } = useQuote()

  return (
    <section id="para-quem" className={styles.section} aria-labelledby="para-quem-title">
      <div className={ui.container}>
        <div className={`${ui.sectionHeadSplit} ${ui.onDark}`}>
          <p className={ui.eyebrowDark}>{content.eyebrow}</p>
          <h2 id="para-quem-title" className={ui.title}>
            {content.title}
          </h2>
          <p className={styles.lead}>{content.description}</p>
        </div>

        <ul className={styles.cards}>
          {content.items.map((item) => {
            const featured = item.id === 'empresas'
            return (
              <li key={item.id} className={featured ? styles.featured : styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon name={AUDIENCE_ICONS[item.id]} />
                  </span>
                  {featured && <span className={styles.badge}>{content.featuredBadge}</span>}
                </div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.description}</p>
                <ul className={styles.points}>
                  {item.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" />
                      {point}
                    </li>
                  ))}
                </ul>
                <a
                  className={`${featured ? ui.light : ui.secondary} ${ui.block}`}
                  href="#contato"
                  onClick={() => requestQuote({ clientType: item.id })}
                >
                  {item.ctaLabel}
                  <Icon name="arrowRight" />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
