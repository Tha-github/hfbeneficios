import type { SiteContent } from '../../content/schema'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './About.module.css'

interface AboutProps {
  content: SiteContent['about']
  imageSrc: string
}

export function About({ content, imageSrc }: AboutProps) {
  return (
    <section id="sobre" className={ui.section} aria-labelledby="sobre-title">
      <div className={`${ui.container} ${styles.grid}`}>
        <figure className={styles.media}>
          <div className={styles.frame}>
            <img
              src={imageSrc}
              alt={content.image.alt}
              width={960}
              height={1200}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 460px, 92vw"
            />
          </div>
          <figcaption className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true">
              <Icon name="sparkle" />
            </span>
            <span>
              <strong>{content.imageCard.title}</strong>
              <span>{content.imageCard.text}</span>
            </span>
          </figcaption>
        </figure>

        <div className={styles.copy}>
          <p className={ui.eyebrow}>{content.eyebrow}</p>
          <h2 id="sobre-title" className={styles.title}>
            {content.title}
          </h2>
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          <ul className={styles.pillars}>
            {content.pillars.map((pillar) => (
              <li key={pillar.title}>
                <span className={styles.pillarIcon} aria-hidden="true">
                  <Icon name="check" />
                </span>
                <span>
                  <strong>{pillar.title}</strong>
                  <span>{pillar.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
