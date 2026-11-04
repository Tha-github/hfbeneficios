import { useEffect, useRef, useState } from 'react'
import type { SiteContent } from '../../content/schema'
import ui from '../styles/ui.module.css'
import { Icon } from './Icon'
import { Logo } from './Logo'
import styles from './Header.module.css'

interface HeaderProps {
  content: SiteContent['header']
  siteName: string
}

export function Header({ content, siteName }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const links = [
    { href: '#solucoes', label: content.nav.solutions },
    { href: '#sobre', label: content.nav.about },
    { href: '#diferenciais', label: content.nav.differentials },
    { href: '#para-quem', label: content.nav.audiences },
    { href: '#contato', label: content.nav.contact },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onResize = () => window.innerWidth >= 960 && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <header className={`${styles.header} ${scrolled || open ? styles.scrolled : ''}`}>
      <div className={styles.bar}>
        <a className={styles.brand} href="#inicio">
          <Logo name={`${siteName} — página inicial`} />
        </a>

        <nav className={styles.desktopNav} aria-label="Principal">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <a className={`${ui.primary} ${styles.cta}`} href="#contato">
          {content.ctaLabel}
        </a>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} />
          <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>
      </div>

      <nav id="menu-mobile" className={styles.mobileNav} hidden={!open} aria-label="Menu">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={() => setOpen(false)}>
                {link.label}
                <Icon name="arrowRight" />
              </a>
            </li>
          ))}
        </ul>
        <a className={`${ui.primary} ${ui.block}`} href="#contato" onClick={() => setOpen(false)}>
          {content.ctaLabel}
        </a>
      </nav>
    </header>
  )
}
