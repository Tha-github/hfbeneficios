import type { Settings } from '../../content/schema'
import ui from '../styles/ui.module.css'
import styles from './Testimonials.module.css'

/*
 * Depoimentos: desativados na versão inicial. Só são exibidos quando habilitados em
 * settings.json com depoimentos reais, fornecidos e autorizados (authorized: true).
 */
export function Testimonials({ testimonials }: { testimonials: Settings['testimonials'] }) {
  const items = testimonials.items.filter((item) => item.authorized === true)
  if (!testimonials.enabled || items.length === 0) return null

  return (
    <section id="depoimentos" className={ui.section} aria-labelledby="depoimentos-title">
      <div className={ui.container}>
        <div className={ui.sectionHead}>
          <p className={ui.eyebrow}>Depoimentos</p>
          <h2 id="depoimentos-title" className={ui.title}>
            Quem já conta com a HF
          </h2>
        </div>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.name + item.quote}>
              <figure className={styles.card}>
                <blockquote>
                  <p>{item.quote}</p>
                </blockquote>
                <figcaption>
                  <strong>{item.name}</strong>
                  <span>{item.context}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
