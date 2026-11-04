import type { Settings, SiteContent } from '../../content/schema'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import { Logo } from './Logo'
import styles from './Footer.module.css'

interface FooterProps {
  content: SiteContent['footer']
  nav: SiteContent['header']['nav']
  services: SiteContent['services']['items']
  settings: Settings
}

export function Footer({ content, nav, services, settings }: FooterProps) {
  const socials = settings.social.filter((s) => s.url)

  return (
    <footer className={styles.footer}>
      <div className={ui.container}>
        <div className={styles.cta}>
          <div>
            <p className={styles.ctaTitle}>{content.ctaTitle}</p>
            <p className={styles.ctaText}>{content.ctaText}</p>
          </div>
          <a className={ui.light} href="#contato">
            {content.ctaLabel}
            <Icon name="arrowRight" />
          </a>
        </div>

        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Logo tone="light" name={settings.siteName} />
            <p>{content.tagline}</p>
            <p className={styles.responsible}>Responsável: {settings.responsible}</p>
          </div>

          <nav aria-label="Rodapé" className={styles.col}>
            <p className={styles.colTitle}>Navegação</p>
            <ul>
              <li>
                <a href="#solucoes">{nav.solutions}</a>
              </li>
              <li>
                <a href="#sobre">{nav.about}</a>
              </li>
              <li>
                <a href="#diferenciais">{nav.differentials}</a>
              </li>
              <li>
                <a href="#para-quem">{nav.audiences}</a>
              </li>
              <li>
                <a href="#contato">{nav.contact}</a>
              </li>
            </ul>
          </nav>

          <div className={styles.col}>
            <p className={styles.colTitle}>Especialidades</p>
            <ul>
              {services.map((service) => (
                <li key={service.id}>
                  <a href={`#${service.id}`}>{service.name}</a>
                </li>
              ))}
            </ul>
          </div>

          {socials.length > 0 && (
            <div className={styles.col}>
              <p className={styles.colTitle}>Redes sociais</p>
              <ul>
                {socials.map((social) => (
                  <li key={social.handle}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer">
                      {social.label} {social.handle}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          <p>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {settings.siteName}. {content.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
