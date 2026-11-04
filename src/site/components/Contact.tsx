import type { Settings, SiteContent } from '../../content/schema'
import ui from '../styles/ui.module.css'
import { Icon, type IconName } from './Icon'
import { LeadForm } from './LeadForm'
import styles from './Contact.module.css'

interface ContactProps {
  content: SiteContent['contact']
  services: SiteContent['services']['items']
  settings: Settings
}

const ASIDE_ICONS: IconName[] = ['eye', 'lock', 'globe']

export function Contact({ content, services, settings }: ContactProps) {
  const socials = settings.social.filter((s) => s.url)

  return (
    <section id="contato" className={ui.section} aria-labelledby="contato-title">
      <div className={ui.container}>
        <div className={styles.shell}>
          <div className={styles.copy}>
            <p className={ui.eyebrow}>{content.eyebrow}</p>
            <h2 id="contato-title" className={ui.title}>
              {content.title}
            </h2>
            <p className={ui.lead}>{content.description}</p>
            <ul className={styles.aside}>
              {content.aside.map((item, index) => (
                <li key={item.title}>
                  <span className={ui.iconBox} aria-hidden="true">
                    <Icon name={ASIDE_ICONS[index]} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <ul className={styles.socials} aria-label="Redes sociais">
                {socials.map((social) => (
                  <li key={social.handle}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer">
                      {social.label} {social.handle}
                      <Icon name="arrowUpRight" />
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.formCard}>
            <LeadForm content={content.form} services={services} whatsappNumber={settings.whatsappNumber} />
          </div>
        </div>
      </div>
    </section>
  )
}
