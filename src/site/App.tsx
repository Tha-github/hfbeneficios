import { assetUrl } from '../content'
import type { Settings, SiteContent } from '../content/schema'
import { About } from './components/About'
import { Audiences } from './components/Audiences'
import { Contact } from './components/Contact'
import { Differentials } from './components/Differentials'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { PartnerSection } from './components/PartnerSection'
import { SpecialtySelector } from './components/SpecialtySelector'
import { Testimonials } from './components/Testimonials'
import { QuoteProvider } from './lib/quote'
import styles from './App.module.css'

export interface ImageOverrides {
  about?: string
  background?: string
}

interface SiteAppProps {
  content: SiteContent
  settings: Settings
  imageOverrides?: ImageOverrides
}

/** Estrutura fixa da página. A ordem e a existência das seções não são configuráveis. */
export function SiteApp({ content, settings, imageOverrides = {} }: SiteAppProps) {
  const services = content.services.items

  return (
    <QuoteProvider>
      {/* Foto de fundo quase transparente: decorativa, fixa atrás de todo o conteúdo. */}
      <div className={styles.backdrop} aria-hidden="true">
        <img
          src={imageOverrides.background ?? assetUrl('images/fundo.webp')}
          alt=""
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="low"
        />
      </div>
      <a className={styles.skip} href="#conteudo">
        Pular para o conteúdo
      </a>
      <Header content={content.header} />
      <main id="conteudo" tabIndex={-1} className={styles.main}>
        <Hero content={content.hero} services={services} audiences={content.audiences.items} />
        <SpecialtySelector content={content.selector} services={services} />
        <About content={content.about} imageSrc={imageOverrides.about ?? assetUrl(content.about.image.src)} />
        <Differentials content={content.differentials} services={services} />
        <Audiences content={content.audiences} />
        <Testimonials testimonials={settings.testimonials} />
        <Contact content={content.contact} services={services} settings={settings} />
        <PartnerSection content={content.partner} whatsappNumber={settings.whatsappNumber} />
      </main>
      <Footer content={content.footer} nav={content.header.nav} services={services} settings={settings} />
    </QuoteProvider>
  )
}
