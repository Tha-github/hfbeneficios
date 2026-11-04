import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { siteSchema } from '../../src/content/schema'

test.describe('painel /admin/', () => {
  test('não é indexável e não expõe credenciais', async ({ page }) => {
    await page.goto('/admin/')
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')
    const html = await page.content()
    expect(html).not.toMatch(/ghp_|github_pat_|token|password|senha/i)
    await expect(page.getByRole('textbox', { name: /senha|password/i })).toHaveCount(0)
  })

  test('edição de texto reflete na prévia real', async ({ page }) => {
    await page.goto('/admin/')
    await page.getByRole('button', { name: 'Hero', exact: true }).click()
    const title = page.getByLabel(/^Título/)
    await title.fill('Proteção sob medida para você')
    await expect(page.getByText(/1 alteração\(ões\) não publicada/)).toBeVisible()

    await page.getByRole('button', { name: 'Pré-visualização' }).click()
    await expect(page.frameLocator('iframe').getByRole('heading', { level: 1 })).toHaveText('Proteção sob medida para você')
  })

  test('exporta site.json válido no schema fechado', async ({ page }) => {
    await page.goto('/admin/')
    await page.getByRole('button', { name: 'Rodapé' }).click()
    await page.getByLabel(/Texto da chamada/).fill('Fale com a HF e receba orientação personalizada.')
    await page.getByRole('button', { name: 'Revisar e publicar' }).click()
    await expect(page.getByText('Conteúdo válido')).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Baixar site.json/ }).click(),
    ])
    expect(download.suggestedFilename()).toBe('site.json')
    const json = JSON.parse(await readFile((await download.path())!, 'utf8'))
    expect(siteSchema.safeParse(json).success).toBe(true)
    expect(json.footer.ctaText).toBe('Fale com a HF e receba orientação personalizada.')
  })

  test('cor vetada bloqueia publicação', async ({ page }) => {
    await page.goto('/admin/')
    await page.getByRole('button', { name: 'Cores' }).click()
    await page.getByLabel('Cor principal: código hexadecimal').fill('#C81E1E')
    await expect(page.getByText(/vetada pela identidade: vermelho/)).toBeVisible()
    await page.getByRole('button', { name: 'Revisar e publicar' }).click()
    await expect(page.getByRole('button', { name: /Baixar site.json/ })).toBeDisabled()
  })

  test('substituição de imagem valida o arquivo real', async ({ page }) => {
    await page.goto('/admin/')
    await page.getByRole('button', { name: 'Imagens' }).click()
    const input = page.locator('input[type="file"]').first()
    await input.setInputFiles({ name: 'falsa.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload="alert(1)"></svg>') })
    await expect(page.getByRole('alert')).toContainText('não corresponde ao formato')

    await input.setInputFiles('public/images/og-image.jpg')
    await expect(page.getByText('substituída')).toBeVisible()
    await expect(page.getByText(/Nova \(\d+ KB\)/)).toBeVisible()
  })

  for (const width of [390, 1440]) {
    test(`painel acessível e sem overflow em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/admin/')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
    })
  }
})
