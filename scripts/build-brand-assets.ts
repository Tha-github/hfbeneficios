/**
 * Gera os arquivos web da identidade visual a partir dos originais do cliente em idvisual/.
 *
 *   npm run brand:assets
 *
 * - Logotipo horizontal colorido (fundos claros) e branco (fundos escuros) em WebP.
 * - Favicon e ícone de toque a partir do símbolo oficial.
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

type RGBA = { r: number; g: number; b: number; alpha: number }

const root = resolve(import.meta.dirname, '..')
const source = (...parts: string[]) => resolve(root, 'idvisual', ...parts)
const assets = resolve(root, 'src/assets/brand')
mkdirSync(assets, { recursive: true })

/** Recorta as margens transparentes e redimensiona pela altura. */
async function logo(input: string, output: string, height: number) {
  const trimmed = await sharp(input).trim({ threshold: 1 }).toBuffer()
  const info = await sharp(trimmed)
    .resize({ height, kernel: 'lanczos3' })
    .webp({ lossless: true, effort: 6 })
    .toFile(output)
  console.log(`${output.replace(root, '.')} — ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)} KB`)
  return info
}

// Versão colorida oficial: símbolo e "BENEFÍCIOS" em azul-petróleo, nome em laranja.
await logo(source('MARCA HORIZONTAL PNG', 'HF_LOGO HORIZONTAL-3.png'), resolve(assets, 'logo-horizontal.webp'), 132)
// Versão para fundos escuros: branco com o detalhe laranja do símbolo.
await logo(source('MARCA HORIZONTAL PNG', 'HF_LOGO HORIZONTAL-6.png'), resolve(assets, 'logo-horizontal-branca.webp'), 132)

// Símbolo (azul com detalhe laranja) para favicon e ícone de toque, com respiro.
const symbol = await sharp(source('SIMBOLO  PNG', 'HF_SIMBOLO-1.png')).trim({ threshold: 1 }).toBuffer()
async function icon(size: number, padding: number, background: RGBA | null, output: string) {
  const inner = size - padding * 2
  const glyph = await sharp(symbol).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(output)
  console.log(`${output.replace(root, '.')} — ${size}×${size}`)
}
await icon(48, 2, null, resolve(root, 'public/favicon.png'))
await icon(180, 26, { r: 255, g: 255, b: 255, alpha: 1 }, resolve(root, 'public/apple-touch-icon.png'))
// Símbolo branco usado nas composições de imagem provisórias.
await sharp(source('SIMBOLO  PNG', 'HF_SIMBOLO-5.png')).trim({ threshold: 1 }).resize({ height: 600 }).png().toFile(resolve(assets, 'simbolo-branco.png'))
console.log('Identidade visual gerada.')
