import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { encryptToken } from '../../src/admin/access'

const siteJson: unknown = JSON.parse(readFileSync('src/content/site.json', 'utf8'))

export const TEST_TOKEN = 'github_pat_11TESTE0000000000000000000000000000000000'
export const TEST_PASSWORD = 'frase longa de teste da HF'
const API = 'https://api.github.com/repos/Tha-github/hfbeneficios'

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64')

/**
 * Simula a API do GitHub para o painel (nenhuma chamada real é feita).
 * Retorna a lista de árvores enviadas em commits, para conferência.
 */
export async function mockGitHub(page: Page) {
  const accessFile = await encryptToken(TEST_TOKEN, TEST_PASSWORD, 'Tha-github/hfbeneficios')
  const commits: { paths: string[] }[] = []
  const authorized: (string | undefined)[] = []

  await page.route(`${API}**`, async (route) => {
    const request = route.request()
    const url = request.url()
    const method = request.method()
    const auth = request.headers()['authorization']
    const reply = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.includes('/contents/public/admin/acesso.json')) return reply({ sha: 'acc', content: b64(JSON.stringify(accessFile)) })
    if (auth !== `Bearer ${TEST_TOKEN}`) return reply({ message: 'Bad credentials' }, 401)
    authorized.push(auth)
    if (url === API) return reply({ full_name: 'Tha-github/hfbeneficios' })
    if (url.includes('/contents/src/content/site.json')) return reply({ sha: 'site-sha', content: b64(JSON.stringify(siteJson)) })
    if (url.includes('/git/ref/heads/main')) return reply({ object: { sha: 'head' } })
    if (method === 'GET' && url.includes('/git/commits/')) return reply({ tree: { sha: 'tree' } })
    if (url.endsWith('/git/blobs')) return reply({ sha: `blob-${commits.length}` })
    if (url.endsWith('/git/trees')) {
      commits.push({ paths: (request.postDataJSON() as { tree: { path: string }[] }).tree.map((t) => t.path) })
      return reply({ sha: 'tree2' })
    }
    if (method === 'POST' && url.endsWith('/git/commits')) return reply({ sha: 'commit2' })
    if (url.includes('/git/refs/heads/main')) return reply({ object: { sha: 'commit2' } })
    return reply({ message: 'Not Found' }, 404)
  })

  return { commits, authorized }
}

export async function loginAdmin(page: Page) {
  const github = await mockGitHub(page)
  await page.goto('/admin/')
  await page.getByLabel('Senha').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('navigation', { name: 'Seções do painel' }).waitFor()
  return github
}
