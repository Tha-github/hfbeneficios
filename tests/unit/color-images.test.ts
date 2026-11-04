import { describe, expect, it } from 'vitest'
import { contrastRatio, forbiddenHue } from '../../src/content/color'
import { coverCrop, sniffImageType } from '../../src/content/images'

describe('cores', () => {
  it('calcula contraste WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('classifica famílias vetadas', () => {
    expect(forbiddenHue('#DC2626')).toBe('vermelho')
    expect(forbiddenHue('#7C3AED')).toBe('roxo')
    expect(forbiddenHue('#DB2777')).toBe('rosa')
    expect(forbiddenHue('#FACC15')).toBe('amarelo intenso')
    expect(forbiddenHue('#1F4FD8')).toBeNull()
    expect(forbiddenHue('#0F766E')).toBeNull()
    expect(forbiddenHue('#333333')).toBeNull()
  })
})

describe('imagens', () => {
  it('identifica o formato real pelos bytes', () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')
    expect(sniffImageType(webp)).toBe('image/webp')
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns='))).toBeNull()
  })

  it('calcula recorte central sem distorção', () => {
    expect(coverCrop(2000, 1000, 1000, 1000)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 })
    expect(coverCrop(960, 1200, 960, 1200)).toEqual({ sx: 0, sy: 0, sw: 960, sh: 1200 })
    const crop = coverCrop(1200, 1200, 1200, 630)
    expect(crop.sw / crop.sh).toBeCloseTo(1200 / 630, 2)
  })
})
