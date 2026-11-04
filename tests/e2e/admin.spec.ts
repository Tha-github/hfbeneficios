import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { siteSchema } from '../../src/content/schema'
import { TEST_PASSWORD, loginAdmin, mockGitHub } from './helpers'

const TOKEN_PATTERN = /github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}/

test.describe('acesso ao painel /admin/', () => {
  test('exige senha antes de mostrar qualquer editor', async ({ page }) => {
    await mockGitHub(page)
    await page.goto('/admin/')
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Seções do painel' })).toHaveCount(0)
    await page.getByLabel('Senha').fill('senha errada de teste')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText(/Senha incorreta/)
    await expect(page.getByRole('navigation', { name: 'Seções do painel' })).toHaveCount(0)
  })

  test('entra com a senha e não guarda a chave no navegador', async ({ page }) => {
    const github = await loginAdmin(page)
    expect(github.authorized.length).toBeGreaterThan(0)
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie)
    expect(stored).not.toMatch(TOKEN_PATTERN)
    await page.getByRole('button', { name: 'Sair do painel' }).first().click()
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
  })

  test('não é indexável e os arquivos publicados não contêm credenciais', async ({ page, request }) => {
    await mockGitHub(page)
    await page.goto('/admin/')
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    expect(csp).toContain("connect-src 'self' https://api.github.com")
    const scripts = await page.locator('script[src], link[rel="modulepreload"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('src') ?? el.getAttribute('href')!),
    )
    for (const src of scripts) expect(await (await request.get(src)).text()).not.toMatch(TOKEN_PATTERN)
    expect(await page.content()).not.toContain(TEST_PASSWORD)
  })
})

test.describe('painel /admin/', () => {
  test('edição de texto reflete na prévia real', async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole('button', { name: 'Hero', exact: true }).click()
    await page.getByLabel(/^Título/).fill('Proteção sob medida para você')
    await expect(page.getByText(/1 alteração\(ões\) não publicada/)).toBeVisible()

    await page.getByRole('button', { name: 'Pré-visualização' }).click()
    await expect(page.frameLocator('iframe').getByRole('heading', { level: 1 })).toHaveText('Proteção sob medida para você')
  })

  test('publica em um único commit, somente com o arquivo de conteúdo', async ({ page }) => {
    const github = await loginAdmin(page)
    await page.getByRole('button', { name: 'Rodapé' }).click()
    await page.getByLabel(/Texto da chamada/).fill('Fale com a HF e receba orientação personalizada.')
    await page.getByRole('button', { name: 'Revisar e publicar' }).click()
    await expect(page.getByText('Conteúdo válido')).toBeVisible()
    await page.getByRole('button', { name: /Publicar no site/ }).click()
    await expect(page.getByText(/Salvo! Publicando no site/)).toBeVisible()
    expect(github.commits).toEqual([{ paths: ['src/content/site.json'] }])
    await expect(page.getByText('Nenhuma alteração pendente.')).toBeVisible()
  })

  test('cópia de segurança exporta site.json válido no schema fechado', async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole('button', { name: 'Rodapé' }).click()
    await page.getByLabel(/Texto da chamada/).fill('Fale com a HF e receba orientação personalizada.')
    await page.getByRole('button', { name: 'Revisar e publicar' }).click()
    await page.getByText('Cópia de segurança do conteúdo').click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Baixar site.json/ }).click()])
    const json = JSON.parse(await readFile((await download.path())!, 'utf8'))
    expect(siteSchema.safeParse(json).success).toBe(true)
    expect(json.footer.ctaText).toBe('Fale com a HF e receba orientação personalizada.')
  })

  test('cor vetada bloqueia publicação', async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole('button', { name: 'Cores' }).click()
    await page.getByLabel('Cor principal: código hexadecimal').fill('#C81E1E')
    await expect(page.getByText(/vetada pela identidade: vermelho/)).toBeVisible()
    await page.getByRole('button', { name: 'Revisar e publicar' }).click()
    await expect(page.getByRole('button', { name: /Publicar no site/ })).toBeDisabled()
  })

  test('substituição de imagem valida o arquivo real', async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole('button', { name: 'Imagens' }).click()
    const input = page.locator('input[type="file"]').first()
    await input.setInputFiles({ name: 'falsa.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload="alert(1)"></svg>') })
    await expect(page.getByRole('alert')).toContainText('não corresponde ao formato')

    await input.setInputFiles('public/images/og-image.jpg')
    await expect(page.getByText('substituída')).toBeVisible()
    await expect(page.getByText(/Nova \(\d+ KB\)/)).toBeVisible()
  })

  for (const width of [390, 1440]) {
    test(`login e painel acessíveis e sem overflow em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await mockGitHub(page)
      await page.goto('/admin/')
      await page.getByLabel('Senha').waitFor()
      const gate = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(gate.violations.map((v) => v.id)).toEqual([])

      await page.getByLabel('Senha').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Entrar' }).click()
      await page.getByRole('navigation', { name: 'Seções do painel' }).waitFor()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
    })
  }
})
