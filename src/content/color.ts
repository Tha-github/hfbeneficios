/** Utilitários de cor usados no schema, no painel e nos testes (sem dependência de DOM). */

export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razão de contraste WCAG 2.x entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

/**
 * Famílias de cor vetadas pelo briefing: vermelho, roxo, rosa e amarelo muito destacado.
 * Cores quase neutras (baixa saturação) são sempre permitidas.
 */
export function forbiddenHue(hex: string): string | null {
  const { h, s, l } = hexToHsl(hex)
  if (s < 0.2 || l < 0.08 || l > 0.96) return null
  if (h >= 345 || h < 15) return 'vermelho'
  if (h >= 285) return 'rosa'
  if (h >= 255) return 'roxo'
  if (h >= 45 && h < 65 && s >= 0.6 && l >= 0.4) return 'amarelo intenso'
  return null
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2).replace('.', ',')}:1`
}
