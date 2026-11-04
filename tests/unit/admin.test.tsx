import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptToken } from '../../src/admin/access'
import { AccessGate, type AdminSession } from '../../src/admin/AccessGate'
import { AdminApp } from '../../src/admin/AdminApp'
import { utf8ToBase64, type GitHubClient } from '../../src/admin/github'
import { publishedContent } from '../../src/content'

function fakeSession(overrides: Partial<GitHubClient> = {}): AdminSession {
  return {
    client: {
      repository: 'Tha-github/hfbeneficios',
      verify: vi.fn(async () => {}),
      readFile: vi.fn(async () => ({ sha: 'sha-publicado', text: JSON.stringify(publishedContent) })),
      commitFiles: vi.fn(async () => ({ commit: 'novo-commit', blobs: { 'src/content/site.json': 'sha-novo' } })),
      ...overrides,
    },
    baseline: publishedContent,
    baselineSha: 'sha-publicado',
    changePassword: vi.fn(async () => {}),
    logout: vi.fn(),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('painel administrativo', () => {
  it('não oferece criar ou remover seções e itens', () => {
    render(<AdminApp session={fakeSession()} />)
    expect(screen.queryByRole('button', { name: /adicionar|nova seção|novo item|excluir|remover/i })).toBeNull()
  })

  it('indica alterações, permite restaurar e salva rascunho local', async () => {
    const user = userEvent.setup()
    render(<AdminApp session={fakeSession()} />)
    await user.click(screen.getByRole('button', { name: 'Hero' }))
    const title = screen.getByLabelText(/^Título/)
    await user.clear(title)
    await user.type(title, 'Proteção sob medida')
    expect(screen.getByText('1 alteração(ões) não publicada(s).', { exact: false })).toBeInTheDocument()
    expect(window.localStorage.getItem('hf-admin-rascunho-v1')).toContain('Proteção sob medida')

    await user.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(title).toHaveValue(publishedContent.hero.title)
    expect(screen.getByText('Nenhuma alteração pendente.')).toBeInTheDocument()
  })

  it('exibe erro de validação no campo e bloqueia a publicação', async () => {
    const user = userEvent.setup()
    render(<AdminApp session={fakeSession()} />)
    await user.click(screen.getByRole('button', { name: 'Rodapé' }))
    const field = screen.getByLabelText(/Direitos reservados/)
    await user.clear(field)
    await user.type(field, 'Texto <b>')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/não são permitidos/)

    await user.click(screen.getAllByRole('button', { name: /Publicar/ })[0])
    expect(screen.getByRole('button', { name: /Publicar no site/ })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('footer.rights')
  })

  it('publica apenas o site.json validado, em um commit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    const session = fakeSession()
    const user = userEvent.setup()
    render(<AdminApp session={session} />)
    await user.click(screen.getByRole('button', { name: 'Rodapé' }))
    const field = screen.getByLabelText(/Texto da chamada/)
    await user.clear(field)
    await user.type(field, 'Fale com a HF e receba orientação.')
    await user.click(screen.getByRole('button', { name: 'Revisar e publicar' }))
    await user.click(screen.getByRole('button', { name: /Publicar no site/ }))

    expect(await screen.findByText(/Salvo! Publicando no site/)).toBeInTheDocument()
    const commit = vi.mocked(session.client.commitFiles)
    expect(commit).toHaveBeenCalledOnce()
    const [files] = commit.mock.calls[0]
    expect(files.map((f) => f.path)).toEqual(['src/content/site.json'])
    const sent = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(files[0].base64), (c) => c.charCodeAt(0))))
    expect(sent.footer.ctaText).toBe('Fale com a HF e receba orientação.')
    expect(screen.getByText('Nenhuma alteração pendente.')).toBeInTheDocument()
  })

  it('bloqueia publicação se outro acesso alterou o conteúdo', async () => {
    const session = fakeSession({ readFile: vi.fn(async () => ({ sha: 'outro-sha', text: '{}' })) })
    const user = userEvent.setup()
    render(<AdminApp session={session} />)
    await user.click(screen.getByRole('button', { name: 'Rodapé' }))
    await user.type(screen.getByLabelText(/Texto da chamada/), ' Agora.')
    await user.click(screen.getByRole('button', { name: 'Revisar e publicar' }))
    await user.click(screen.getByRole('button', { name: /Publicar no site/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/alterado em outro acesso/)
    expect(session.client.commitFiles).not.toHaveBeenCalled()
  })

  it('valida as cores contra contraste e famílias vetadas', async () => {
    const user = userEvent.setup()
    render(<AdminApp session={fakeSession()} />)
    await user.click(screen.getByRole('button', { name: 'Cores' }))
    const hex = screen.getByLabelText('Cor principal: código hexadecimal')
    await user.clear(hex)
    await user.type(hex, '#C81E1E')
    expect(screen.getByText(/Família de cor vetada pela identidade: vermelho/)).toBeInTheDocument()
  })
})

describe('tela de acesso', () => {
  const TOKEN = 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const PASSWORD = 'frase longa da HF para teste'

  async function stubRepo() {
    const file = await encryptToken(TOKEN, PASSWORD, 'Tha-github/hfbeneficios')
    const auths: (string | null)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        auths.push(new Headers(init.headers).get('Authorization'))
        if (url.includes('contents/public/admin/acesso.json')) {
          return new Response(JSON.stringify({ sha: 'a', content: utf8ToBase64(JSON.stringify(file)) }))
        }
        if (url.includes('contents/src/content/site.json')) {
          return new Response(JSON.stringify({ sha: 'b', content: utf8ToBase64(JSON.stringify(publishedContent)) }))
        }
        if (url.endsWith('/repos/Tha-github/hfbeneficios')) return new Response('{}')
        return new Response('', { status: 404 })
      }),
    )
    return auths
  }

  it('exige a senha e recusa senha incorreta', async () => {
    await stubRepo()
    const user = userEvent.setup()
    render(<AccessGate />)
    const input = await screen.findByLabelText('Senha')
    await user.type(input, 'senha errada qualquer')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent('Senha incorreta')
    expect(screen.queryByRole('navigation', { name: 'Seções do painel' })).toBeNull()
  }, 15_000)

  it('entra com a senha correta e usa a chave só nas chamadas autenticadas', async () => {
    const auths = await stubRepo()
    const user = userEvent.setup()
    render(<AccessGate />)
    await user.type(await screen.findByLabelText('Senha'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('navigation', { name: 'Seções do painel' }, { timeout: 5000 })).toBeInTheDocument()
    expect(auths[0]).toBeNull()
    expect(auths.slice(1).every((a) => a === `Bearer ${TOKEN}`)).toBe(true)
    expect(JSON.stringify(window.localStorage)).not.toContain(TOKEN)
    expect(JSON.stringify(window.sessionStorage)).not.toContain(TOKEN)
  }, 15_000)
})
