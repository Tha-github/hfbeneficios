import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, coverCrop, sniffImageType, type ImageSlot } from '../content/images'

/*
 * Substituição de imagem no navegador:
 * 1. confere tamanho, tipo declarado e assinatura real do arquivo;
 * 2. decodifica e re-codifica via canvas no formato e dimensões do espaço
 *    (remove metadados EXIF e qualquer conteúdo embutido);
 * 3. ajusta a qualidade até respeitar o limite de peso.
 */

export interface ProcessedImage {
  blob: Blob
  url: string
  sourceWidth: number
  sourceHeight: number
  warnings: string[]
}

export async function processUpload(file: File, slot: ImageSlot): Promise<ProcessedImage> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Arquivo maior que 10 MB. Escolha uma imagem menor.')
  if (!(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Formato não aceito. Use JPG, PNG ou WebP.')
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sniffImageType(header) !== file.type) {
    throw new Error('O conteúdo do arquivo não corresponde ao formato declarado.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível ler a imagem. O arquivo pode estar corrompido.')
  }

  const { width: sourceWidth, height: sourceHeight } = bitmap
  if (sourceWidth < slot.width * 0.5 || sourceHeight < slot.height * 0.5) {
    bitmap.close()
    throw new Error(`Imagem muito pequena (${sourceWidth}×${sourceHeight}). Mínimo recomendado: ${slot.width}×${slot.height}.`)
  }

  const warnings: string[] = []
  if (sourceWidth < slot.width || sourceHeight < slot.height) {
    warnings.push(`A imagem será ampliada para ${slot.width}×${slot.height} e pode perder nitidez.`)
  }
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = slot.width / slot.height
  if (Math.abs(sourceRatio - targetRatio) / targetRatio > 0.15) {
    warnings.push('As proporções são diferentes do espaço: as bordas serão recortadas a partir do centro.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = slot.width
  canvas.height = slot.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não permite processar imagens.')
  const { sx, sy, sw, sh } = coverCrop(sourceWidth, sourceHeight, slot.width, slot.height)
  if (slot.mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slot.width, slot.height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, slot.width, slot.height)
  bitmap.close()

  let blob: Blob | null = null
  for (let quality = 0.86; quality >= 0.5; quality -= 0.06) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, slot.mime, quality))
    if (!blob) break
    if (blob.type !== slot.mime) throw new Error('Seu navegador não gera este formato. Use Chrome, Edge ou Firefox atualizados.')
    if (blob.size <= slot.maxBytes) break
  }
  if (!blob) throw new Error('Falha ao gerar a imagem.')
  if (blob.size > slot.maxBytes) throw new Error('Não foi possível reduzir a imagem ao peso máximo. Tente uma imagem mais simples.')

  return { blob, url: URL.createObjectURL(blob), sourceWidth, sourceHeight, warnings }
}
