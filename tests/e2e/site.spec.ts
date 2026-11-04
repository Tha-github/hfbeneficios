import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { loginAdmin } from './helpers'

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920]

/** Coleta erros de console (inclui violações de CSP) e exceções da página. */
function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test.describe('responsividade', () => {
  for (const width of WIDTHS) {
    test(`sem overflow horizontal e CTA acessível em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const errors = trackErrors(page)
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await expect(page.locator('#inicio').getByRole('link', { name: /Solicitar cotação/ })).toBeInViewport()
      const tooSmall = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main a, main button, main input, main select')]
          .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.height < 24 && el.getAttribute('type') !== 'radio'
          })
          .map((el) => el.outerHTML.slice(0, 80)),
      )
      expect(tooSmall).toEqual([])
      expect(errors).toEqual([])
    })
  }
})

test.describe('acessibilidade (axe, WCAG 2.1 AA)', () => {
  for (const width of [390, 1440]) {
    test(`página inicial sem violações em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
    })
  }

  test('formulário com erros continua acessível', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#contato')
    await page.getByRole('button', { name: /Continuar no WhatsApp/ }).click()
    await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true')
    const results = await new AxeBuilder({ page }).include('#contato').withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.map((v) => v.id)).toEqual([])
  })
})

test.describe('interações', () => {
  test('seletor de especialidades por teclado', async ({ page }) => {
    await page.goto('/')
    const first = page.getByRole('tab', { name: /Planos de Saúde/ })
    await first.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /Planos Odontológicos/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toContainText('Alternativas de proteção odontológica')
  })

  test('link direto abre a especialidade', async ({ page }) => {
    await page.goto('/#seguros-agricolas')
    await expect(page.getByRole('tab', { name: /Seguros Agrícolas/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toBeInViewport()
  })

  test('CTA leva ao formulário com a especialidade escolhida', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /Seguro Saúde/ }).click()
    await page.getByRole('link', { name: /Cotar seguro saúde/ }).click()
    await expect(page).toHaveURL(/#contato$/)
    await expect(page.getByLabel('Especialidade de interesse')).toHaveValue('seguro-saude')
  })

  test('formulário sem número configurado não abre o WhatsApp', async ({ page }) => {
    await page.goto('/#contato')
    await page.getByLabel('Nome').fill('Maria Souza')
    await page.getByLabel('WhatsApp').fill('65999991234')
    await expect(page.getByLabel('WhatsApp')).toHaveValue('(65) 99999-1234')
    await page.getByLabel('Produtor rural').check()
    await page.getByLabel('Especialidade de interesse').selectOption('seguros-agricolas')
    const popup = page.waitForEvent('popup', { timeout: 1000 }).catch(() => null)
    await page.getByRole('button', { name: /Continuar no WhatsApp/ }).click()
    expect(await popup).toBeNull()
    await expect(page.getByRole('status').filter({ hasText: /em configuração/ })).toBeVisible()
  })

  test('menu móvel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Diferenciais' }).click()
    await expect(menu).toBeHidden()
    await expect(page.locator('#diferenciais')).toBeInViewport()
  })

  test('funciona sem JavaScript (HTML pré-renderizado)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Proteção inteligente')
    await expect(page.getByText('Mais de 40 operadoras no portfólio').first()).toBeVisible()
    await context.close()
  })
})

test.describe('SEO e segurança', () => {
  test('metadados, Open Graph, canonical e dados estruturados', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/HF Seguros e Benefícios/)
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toMatch(/planos de saúde/)
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/^https?:\/\//)
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:image', 'og:locale']) {
      expect(await page.locator(`meta[property="${prop}"]`).getAttribute('content')).toBeTruthy()
    }
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
    expect(ld['@type']).toBe('InsuranceAgency')
    expect(ld.name).toBe('HF Seguros e Benefícios')
    expect(ld).not.toHaveProperty('address')
    expect(ld).not.toHaveProperty('aggregateRating')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    const images = await page.locator('img').evaluateAll((els) => els.filter((el) => !el.hasAttribute('alt')).length)
    expect(images).toBe(0)
  })

  test('robots.txt, sitemap.xml e 404', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /admin/')
    expect(robots).toMatch(/Sitemap: https?:\/\/.+sitemap\.xml/)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('<urlset')
    expect((await request.get('/404.html')).ok()).toBe(true)
  })

  test('CSP aplicada e sem recursos de terceiros', async ({ page }) => {
    const external: string[] = []
    page.on('request', (req) => !req.url().startsWith('http://localhost:4173') && external.push(req.url()))
    await page.goto('/')
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(external).toEqual([])
  })

  test('prévia ignora mensagens fora do protocolo e conteúdo inválido', async ({ page }) => {
    await loginAdmin(page)
    await page.getByRole('button', { name: 'Pré-visualização' }).click()
    const frame = page.frameLocator('iframe')
    await expect(frame.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => {
      const win = document.querySelector('iframe')!.contentWindow!
      win.postMessage({ type: 'hf:preview', content: { hero: { title: '<img src=x onerror=alert(1)>' } }, images: {} }, location.origin)
    })
    await page.waitForTimeout(300)
    await expect(frame.getByRole('heading', { level: 1 })).toContainText('Proteção inteligente')
  })
})
