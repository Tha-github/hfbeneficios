import { ACCESS_FILE_PATH, bytesToBase64 } from './access'

/*
 * Cliente mínimo da API do GitHub usado pelo painel.
 * Só grava os arquivos da lista abaixo — nunca código, estilos ou workflows —
 * e envia tudo em um único commit (um único deploy).
 */

const API = 'https://api.github.com'

export const WRITABLE_PATHS = [
  'src/content/site.json',
  'public/images/sobre.webp',
  'public/images/og-image.jpg',
  ACCESS_FILE_PATH,
] as const

export type WritablePath = (typeof WRITABLE_PATHS)[number]

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface RepoFile {
  sha: string
  text: string
}

export interface FileToCommit {
  path: WritablePath
  base64: string
}

export const utf8ToBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text))
export const blobToBase64 = async (blob: Blob) => bytesToBase64(new Uint8Array(await blob.arrayBuffer()))

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

export interface GitHubClient {
  repository: string
  verify(): Promise<void>
  readFile(path: WritablePath): Promise<RepoFile | null>
  commitFiles(files: FileToCommit[], message: string): Promise<{ commit: string; blobs: Record<string, string> }>
}

export function createGitHubClient(token: string | null, repository: string, branch: string): GitHubClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${API}/repos/${repository}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      })
    } catch {
      throw new GitHubError(0, 'Sem conexão com o GitHub. Verifique a internet e tente de novo.')
    }
    if (!response.ok) throw new GitHubError(response.status, await response.text().catch(() => ''))
    return (await response.json()) as T
  }

  const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

  return {
    repository,

    async verify() {
      await request('')
    },

    async readFile(path) {
      try {
        const data = await request<{ sha: string; content: string; encoding: string }>(
          `/contents/${path}?ref=${encodeURIComponent(branch)}`,
        )
        return { sha: data.sha, text: decodeBase64Utf8(data.content) }
      } catch (error) {
        if (error instanceof GitHubError && error.status === 404) return null
        throw error
      }
    },

    async commitFiles(files, message) {
      if (files.length === 0) throw new Error('Nada para publicar.')
      for (const file of files) {
        if (!(WRITABLE_PATHS as readonly string[]).includes(file.path)) throw new Error(`Caminho não permitido: ${file.path}`)
      }
      const ref = await request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`)
      const parent = await request<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`)
      const blobs: Record<string, string> = {}
      for (const file of files) {
        const blob = await request<{ sha: string }>('/git/blobs', json({ content: file.base64, encoding: 'base64' }))
        blobs[file.path] = blob.sha
      }
      const tree = await request<{ sha: string }>(
        '/git/trees',
        json({
          base_tree: parent.tree.sha,
          tree: files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', sha: blobs[file.path] })),
        }),
      )
      const commit = await request<{ sha: string }>('/git/commits', json({ message, tree: tree.sha, parents: [ref.object.sha] }))
      // Sem `force`: se outra publicação entrou no meio, o GitHub recusa em vez de sobrescrever.
      await request(`/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      })
      return { commit: commit.sha, blobs }
    },
  }
}

/** Mensagens claras para a cliente a partir dos erros da API. */
export function describeGitHubError(error: unknown): string {
  if (!(error instanceof GitHubError)) return (error as Error)?.message || 'Erro inesperado.'
  switch (error.status) {
    case 0:
      return error.message
    case 401:
      return 'A chave de acesso do GitHub expirou ou foi revogada. É preciso reconfigurar o acesso (fale com quem mantém o site).'
    case 403:
      return 'A chave não tem permissão para gravar neste repositório, ou a branch está protegida. Confira no token: acesso a este repositório e "Contents: Read and write".'
    case 404:
      return 'Repositório não encontrado com esta chave. Confira se o token dá acesso a este repositório.'
    case 409:
    case 422:
      return 'Outra alteração foi publicada ao mesmo tempo. Recarregue o painel e tente de novo.'
    default:
      return `O GitHub recusou a operação (código ${error.status}). Tente novamente em instantes.`
  }
}
