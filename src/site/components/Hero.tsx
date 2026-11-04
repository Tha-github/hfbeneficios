import type { SiteContent } from '../../content/schema'
import { AUDIENCE_ICONS, SERVICE_ICONS } from '../lib/icons'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import styles from './Hero.module.css'

interface HeroProps {
  content: SiteContent['hero']
  services: SiteContent['services']['items']
  audiences: SiteContent['audiences']['items']
}

export function Hero({ content, services, audiences }: HeroProps) {
  return (
    <section id="inicio" className={styles.hero} aria-labelledby="hero-title">
      <div className={`${ui.container} ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={ui.eyebrow}>{content.eyebrow}</p>
          <h1 id="hero-title" className={styles.title}>
            {content.title}
          </h1>
          <p className={styles.description}>{content.description}</p>
          <div className={styles.actions}>
            <a className={ui.primary} href="#contato">
              {content.primaryCta}
              <Icon name="arrowRight" />
            </a>
            <a className={ui.secondary} href="#solucoes">
              {content.secondaryCta}
            </a>
          </div>
          <p className={styles.trust}>
            <span className={styles.trustIcon}>
              <Icon name="check" />
            </span>
            {content.trustNote}
          </p>
        </div>

        {/* Composição ilustrativa: repete informações já presentes na página, por isso é oculta para leitores de tela. */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.rings} />

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelLabel}>
                <Icon name="shield" />
                {content.panel.label}
              </span>
              <span className={styles.status}>{content.panel.status}</span>
            </div>
            <p className={styles.panelTitle}>{content.panel.title}</p>
            <ul className={styles.rows}>
              {services.map((service, index) => (
                <li key={service.id} className={index === 0 ? styles.rowActive : styles.row}>
                  <span className={styles.rowIcon}>
                    <Icon name={SERVICE_ICONS[service.id]} />
                  </span>
                  <span className={styles.rowText}>
                    <strong>{service.name}</strong>
                    <span>{service.tag}</span>
                  </span>
                  <span className={styles.rowCheck}>
                    <Icon name="check" />
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.panelFoot}>
              <span className={styles.avatars}>
                {audiences.map((audience) => (
                  <span key={audience.id}>
                    <Icon name={AUDIENCE_ICONS[audience.id]} />
                  </span>
                ))}
              </span>
              <span className={styles.footText}>{audiences.map((a) => a.title).join(' · ')}</span>
            </div>
          </div>

          <div className={`${styles.float} ${styles.partners}`}>
            <span className={styles.partnersValue}>{content.partnersValue}</span>
            <span className={styles.partnersLabel}>{content.partnersLabel}</span>
          </div>

          <div className={`${styles.float} ${styles.consultive}`}>
            <span className={styles.floatIcon}>
              <Icon name="chat" />
            </span>
            <span>
              <strong>{content.consultive.title}</strong>
              <span>{content.consultive.text}</span>
            </span>
          </div>

          <div className={`${styles.float} ${styles.coverage}`}>
            <span className={`${styles.floatIcon} ${styles.floatIconAccent}`}>
              <Icon name="globe" />
            </span>
            <span>
              <strong>{content.coverage.title}</strong>
              <span>{content.coverage.text}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
