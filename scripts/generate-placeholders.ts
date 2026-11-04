/**
 * Gera as imagens PROVISÓRIAS (composições gráficas com as cores da marca), usadas até o
 * recebimento de fotos oficiais. Não usa banco de imagens. Substitua pelo painel em /admin/.
 *
 *   npm run images:placeholders
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { SiteContent } from '../src/content/schema'

const root = resolve(import.meta.dirname, '..')
const { theme } = JSON.parse(readFileSync(resolve(root, 'src/content/site.json'), 'utf8')) as SiteContent
mkdirSync(resolve(root, 'public/images'), { recursive: true })

const grid = (w: number, h: number, step: number, color: string) =>
  Array.from({ length: Math.ceil(w / step) }, (_, i) => `<line x1="${i * step}" y1="0" x2="${i * step}" y2="${h}" stroke="${color}"/>`)
    .concat(Array.from({ length: Math.ceil(h / step) }, (_, i) => `<line x1="0" y1="${i * step}" x2="${w}" y2="${i * step}" stroke="${color}"/>`))
    .join('')

const about = `
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.brand}"/>
      <stop offset="1" stop-color="${theme.brandDeep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.2" r="0.7">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.1" cy="0.95" r="0.6">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="1200" fill="url(#bg)"/>
  <rect width="960" height="1200" fill="url(#glow)"/>
  <rect width="960" height="1200" fill="url(#glow2)"/>
  <g stroke-width="1" opacity="0.5">${grid(960, 1200, 80, 'rgba(255,255,255,0.08)')}</g>
  <g fill="none" stroke="#fff">
    <circle cx="560" cy="520" r="360" stroke-opacity="0.16"/>
    <circle cx="560" cy="520" r="270" stroke-opacity="0.22" stroke-dasharray="6 10"/>
    <circle cx="560" cy="520" r="180" stroke-opacity="0.3"/>
  </g>
  <path d="M560 330 L700 386 V500 C700 594 640 664 560 694 C480 664 420 594 420 500 V386 Z"
        fill="rgba(255,255,255,0.12)" stroke="#fff" stroke-opacity="0.8" stroke-width="5" stroke-linejoin="round"/>
  <path d="M560 450 V570 M500 510 H620" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <g>
    <rect x="96" y="820" width="300" height="96" rx="28" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.3)"/>
    <rect x="124" y="848" width="40" height="40" rx="12" fill="#fff" fill-opacity="0.9"/>
    <rect x="182" y="852" width="170" height="12" rx="6" fill="#fff" fill-opacity="0.85"/>
    <rect x="182" y="874" width="120" height="10" rx="5" fill="#fff" fill-opacity="0.45"/>
    <rect x="96" y="936" width="380" height="96" rx="28" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)"/>
    <rect x="124" y="964" width="40" height="40" rx="12" fill="#fff" fill-opacity="0.7"/>
    <rect x="182" y="968" width="210" height="12" rx="6" fill="#fff" fill-opacity="0.7"/>
    <rect x="182" y="990" width="140" height="10" rx="5" fill="#fff" fill-opacity="0.35"/>
  </g>
  <g fill="#fff">
    <circle cx="780" cy="200" r="6" fill-opacity="0.7"/>
    <circle cx="180" cy="300" r="4" fill-opacity="0.5"/>
    <circle cx="820" cy="900" r="5" fill-opacity="0.5"/>
  </g>
</svg>`

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="0.85" cy="0.1" r="0.8">
      <stop offset="0" stop-color="${theme.brand}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${theme.brand}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="0" cy="1" r="0.6">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${theme.brandDeep}"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <g opacity="0.6">${grid(1200, 630, 70, 'rgba(255,255,255,0.06)')}</g>
  <g fill="none" stroke="#fff">
    <circle cx="960" cy="315" r="250" stroke-opacity="0.14"/>
    <circle cx="960" cy="315" r="180" stroke-opacity="0.2" stroke-dasharray="6 10"/>
  </g>
  <path d="M960 190 L1060 230 V312 C1060 380 1017 430 960 452 C903 430 860 380 860 312 V230 Z"
        fill="rgba(255,255,255,0.12)" stroke="#fff" stroke-opacity="0.85" stroke-width="4" stroke-linejoin="round"/>
  <path d="M960 280 V364 M918 322 H1002" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
  <rect x="80" y="96" width="72" height="72" rx="20" fill="${theme.brand}"/>
  <text x="116" y="144" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="800" fill="#fff">HF</text>
  <text x="80" y="280" font-family="Segoe UI, Arial, sans-serif" font-size="60" font-weight="700" fill="#fff" letter-spacing="-1.5">HF Seguros</text>
  <text x="80" y="348" font-family="Segoe UI, Arial, sans-serif" font-size="60" font-weight="700" fill="#fff" letter-spacing="-1.5">e Benefícios</text>
  <text x="80" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#fff" fill-opacity="0.82">Planos de saúde · Planos odontológicos</text>
  <text x="80" y="468" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#fff" fill-opacity="0.82">Seguro saúde · Seguros agrícolas</text>
</svg>`

await sharp(Buffer.from(about)).resize(960, 1200).webp({ quality: 82 }).toFile(resolve(root, 'public/images/sobre.webp'))
await sharp(Buffer.from(og)).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile(resolve(root, 'public/images/og-image.jpg'))

console.log('Imagens provisórias geradas em public/images/.')
