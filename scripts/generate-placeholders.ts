/**
 * Gera as imagens de composição gráfica (seção institucional e compartilhamento) com a
 * identidade oficial: cores de site.json e logotipo/símbolo de idvisual/. Não usa banco de
 * imagens. Podem ser substituídas por fotos oficiais pelo painel em /admin/.
 *
 *   npm run images:placeholders
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { SiteContent } from '../src/content/schema'

const root = resolve(import.meta.dirname, '..')
const { theme } = JSON.parse(readFileSync(resolve(root, 'src/content/site.json'), 'utf8')) as SiteContent
const brand = (...parts: string[]) => resolve(root, 'idvisual', ...parts)
mkdirSync(resolve(root, 'public/images'), { recursive: true })

const grid = (w: number, h: number, step: number, color: string) =>
  Array.from({ length: Math.ceil(w / step) }, (_, i) => `<line x1="${i * step}" y1="0" x2="${i * step}" y2="${h}" stroke="${color}"/>`)
    .concat(Array.from({ length: Math.ceil(h / step) }, (_, i) => `<line x1="0" y1="${i * step}" x2="${w}" y2="${i * step}" stroke="${color}"/>`))
    .join('')

const trimmed = (path: string) => sharp(path).trim({ threshold: 1 }).toBuffer()

/* ---------- Seção institucional (960×1200) ---------- */
const aboutBg = `
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.brand}"/>
      <stop offset="1" stop-color="${theme.brandDeep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.7">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.05" cy="0.95" r="0.6">
      <stop offset="0" stop-color="#fff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="1200" fill="url(#bg)"/>
  <rect width="960" height="1200" fill="url(#glow)"/>
  <rect width="960" height="1200" fill="url(#glow2)"/>
  <g stroke-width="1">${grid(960, 1200, 80, 'rgba(255,255,255,0.05)')}</g>
  <g fill="none" stroke="#fff">
    <circle cx="480" cy="520" r="370" stroke-opacity="0.12"/>
    <circle cx="480" cy="520" r="280" stroke-opacity="0.18" stroke-dasharray="6 12"/>
    <circle cx="480" cy="520" r="190" stroke-opacity="0.24"/>
  </g>
  <g>
    <rect x="96" y="860" width="320" height="96" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)"/>
    <rect x="124" y="888" width="40" height="40" rx="12" fill="${theme.accent}"/>
    <rect x="182" y="892" width="180" height="12" rx="6" fill="#fff" fill-opacity="0.85"/>
    <rect x="182" y="914" width="120" height="10" rx="5" fill="#fff" fill-opacity="0.4"/>
  </g>
</svg>`
const symbol = await sharp(await trimmed(brand('SIMBOLO  PNG', 'HF_SIMBOLO-5.png'))).resize({ width: 300 }).toBuffer()
await sharp(Buffer.from(aboutBg))
  .composite([{ input: symbol, top: 520 - Math.round((await sharp(symbol).metadata()).height! / 2), left: 330 }])
  .webp({ quality: 84 })
  .toFile(resolve(root, 'public/images/sobre.webp'))

/* ---------- Compartilhamento (1200×630) ---------- */
const ogBg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="g1" cx="0.92" cy="0.05" r="0.8">
      <stop offset="0" stop-color="${theme.brand}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${theme.brand}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0" cy="1" r="0.6">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${theme.brandDeep}"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <g>${grid(1200, 630, 70, 'rgba(255,255,255,0.04)')}</g>
  <rect x="80" y="448" width="64" height="6" rx="3" fill="${theme.accent}"/>
  <text x="80" y="510" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#fff" fill-opacity="0.9">Planos de saúde · Planos odontológicos</text>
  <text x="80" y="552" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#fff" fill-opacity="0.9">Seguro saúde · Seguros agrícolas</text>
</svg>`
const logo = await sharp(await trimmed(brand('MARCA HORIZONTAL PNG', 'HF_LOGO HORIZONTAL-6.png'))).resize({ width: 640 }).toBuffer()
await sharp(Buffer.from(ogBg))
  .composite([{ input: logo, top: 110, left: 80 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(resolve(root, 'public/images/og-image.jpg'))

console.log('Imagens geradas em public/images/ com a identidade oficial.')
