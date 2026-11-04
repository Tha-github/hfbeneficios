import styles from './Logo.module.css'

/** Assinatura tipográfica provisória, até o recebimento do logotipo oficial. */
export function Logo({ tone = 'dark', name }: { tone?: 'dark' | 'light'; name: string }) {
  return (
    <span className={`${styles.logo} ${tone === 'light' ? styles.light : ''}`}>
      <span className={styles.mark} aria-hidden="true">
        HF
      </span>
      <span className={styles.word} aria-hidden="true">
        <span className={styles.primary}>HF Seguros</span>
        <span className={styles.secondary}>e Benefícios</span>
      </span>
      <span className="sr-only">{name}</span>
    </span>
  )
}
