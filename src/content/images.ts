/**
 * Espaços de imagem existentes no site. O painel só substitui o arquivo de um espaço;
 * não cria nem remove espaços. Caminhos relativos a /public.
 */
export interface ImageSlot {
  id: 'about' | 'og'
  label: string
  description: string
  file: string
  width: number
  height: number
  mime: 'image/webp' | 'image/jpeg'
  maxBytes: number
}

export const IMAGE_SLOTS: readonly ImageSlot[] = [
  {
    id: 'about',
    label: 'Imagem da seção institucional',
    description: 'Exibida ao lado da apresentação da HF. Recorte vertical 4:5.',
    file: 'images/sobre.webp',
    width: 960,
    height: 1200,
    mime: 'image/webp',
    maxBytes: 350 * 1024,
  },
  {
    id: 'og',
    label: 'Imagem de compartilhamento',
    description: 'Aparece em prévias de links (WhatsApp, redes sociais). Recorte 1200×630.',
    file: 'images/og-image.jpg',
    width: 1200,
    height: 630,
    mime: 'image/jpeg',
    maxBytes: 300 * 1024,
  },
] as const

export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Identifica o formato real do arquivo pelos bytes iniciais, sem confiar na extensão. */
export function sniffImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

/** Área de origem para preencher o destino sem distorção (equivalente a object-fit: cover). */
export function coverCrop(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const sw = Math.round(dstW / scale)
  const sh = Math.round(dstH / scale)
  return { sx: Math.round((srcW - sw) / 2), sy: Math.round((srcH - sh) / 2), sw, sh }
}
