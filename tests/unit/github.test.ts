import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubError, createGitHubClient, describeGitHubError, utf8ToBase64 } from '../../src/admin/github'

const REPO = 'Tha-github/hfbeneficios'

function mockFetch(responses: Record<string, unknown>) {
  const calls: { method: string; url: string; body?: unknown; auth?: string | null }[] = []
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const headers = new Headers(init.headers)
    calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined, auth: headers.get('Authorization') })
    const key = Object.keys(responses).find((k) => `${method} ${url}`.includes(k))
    if (!key) return new Response('não encontrado', { status: 404 })
    const value = responses[key]
    if (typeof value === 'number') return new Response('erro', { status: value })
    return new Response(JSON.stringify(value), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe('cliente do GitHub', () => {
  it('publica vários arquivos em um único commit, sem forçar', async () => {
    const calls = mockFetch({
      'GET https://api.github.com/repos/Tha-github/hfbeneficios/git/ref/heads/main': { object: { sha: 'head1' } },
      'GET https://api.github.com/repos/Tha-github/hfbeneficios/git/commits/head1': { tree: { sha: 'tree1' } },
      'POST https://api.github.com/repos/Tha-github/hfbeneficios/git/blobs': { sha: 'blob1' },
      'POST https://api.github.com/repos/Tha-github/hfbeneficios/git/trees': { sha: 'tree2' },
      'POST https://api.github.com/repos/Tha-github/hfbeneficios/git/commits': { sha: 'commit2' },
      'PATCH https://api.github.com/repos/Tha-github/hfbeneficios/git/refs/heads/main': { object: { sha: 'commit2' } },
    })
    const client = createGitHubClient('github_pat_teste', REPO, 'main')
    const result = await client.commitFiles(
      [
        { path: 'src/content/site.json', base64: utf8ToBase64('{}') },
        { path: 'public/images/sobre.webp', base64: 'AAAA' },
      ],
      'Painel: teste',
    )
    expect(result.commit).toBe('commit2')
    expect(calls.map((c) => `${c.method} ${c.url.split('/hfbeneficios')[1]}`)).toEqual([
      'GET /git/ref/heads/main',
      'GET /git/commits/head1',
      'POST /git/blobs',
      'POST /git/blobs',
      'POST /git/trees',
      'POST /git/commits',
      'PATCH /git/refs/heads/main',
    ])
    expect(calls.every((c) => c.auth === 'Bearer github_pat_teste')).toBe(true)
    const tree = calls[4].body as { base_tree: string; tree: { path: string }[] }
    expect(tree.base_tree).toBe('tree1')
    expect(tree.tree.map((t) => t.path)).toEqual(['src/content/site.json', 'public/images/sobre.webp'])
    expect((calls[6].body as { force: boolean }).force).toBe(false)
  })

  it('recusa gravar fora dos arquivos de conteúdo', async () => {
    const calls = mockFetch({})
    const client = createGitHubClient('github_pat_teste', REPO, 'main')
    await expect(
      client.commitFiles([{ path: '.github/workflows/deploy.yml' as never, base64: 'AAAA' }], 'x'),
    ).rejects.toThrow('Caminho não permitido')
    await expect(client.commitFiles([{ path: 'src/site/App.tsx' as never, base64: 'AAAA' }], 'x')).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })

  it('lê arquivo com acentos e trata ausência', async () => {
    mockFetch({
      'contents/src/content/site.json': { sha: 's1', content: utf8ToBase64('{"t":"Benefícios"}'), encoding: 'base64' },
    })
    const client = createGitHubClient(null, REPO, 'main')
    expect(await client.readFile('src/content/site.json')).toEqual({ sha: 's1', text: '{"t":"Benefícios"}' })
    expect(await client.readFile('public/admin/acesso.json')).toBeNull()
  })

  it('traduz erros da API para a cliente', () => {
    expect(describeGitHubError(new GitHubError(401, ''))).toMatch(/expirou ou foi revogada/)
    expect(describeGitHubError(new GitHubError(403, ''))).toMatch(/permissão/)
    expect(describeGitHubError(new GitHubError(422, ''))).toMatch(/ao mesmo tempo/)
  })
})
