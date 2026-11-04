import logoBranca from '../../assets/brand/logo-horizontal-branca.webp'
import logoColorida from '../../assets/brand/logo-horizontal.webp'
import styles from './Logo.module.css'

/** Texto presente no logotipo oficial (usado como texto alternativo). */
export const LOGO_TEXT = 'Honorato Freitas Benefícios'

/** Logotipo oficial: colorido em fundos claros, branco em fundos escuros. */
export function Logo({ tone = 'dark', label = LOGO_TEXT }: { tone?: 'dark' | 'light'; label?: string }) {
  const light = tone === 'light'
  return (
    <img
      className={styles.logo}
      src={light ? logoBranca : logoColorida}
      alt={label}
      width={light ? 431 : 451}
      height={132}
      decoding="async"
    />
  )
}
