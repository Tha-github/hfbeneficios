import { describe, expect, it } from 'vitest'
import {
  ITERATIONS,
  accessFileSchema,
  decryptToken,
  encryptToken,
  passwordProblem,
  tokenProblem,
} from '../../src/admin/access'

const TOKEN = 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const REPO = 'Tha-github/hfbeneficios'

describe('cifragem da chave de acesso', () => {
  it('cifra e decifra com a senha correta', async () => {
    const file = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    expect(JSON.stringify(file)).not.toContain(TOKEN)
    expect(await decryptToken(file, 'uma frase longa de teste', REPO)).toBe(TOKEN)
  })

  it('recusa senha errada', async () => {
    const file = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    expect(await decryptToken(file, 'outra frase qualquer!!', REPO)).toBeNull()
  })

  it('não funciona se o arquivo for copiado para outro repositório', async () => {
    const file = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    expect(await decryptToken(file, 'uma frase longa de teste', 'outra/conta')).toBeNull()
  })

  it('usa sal e vetor aleatórios a cada cifragem', async () => {
    const a = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    const b = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('o arquivo publicado exige o mínimo de iterações e formato fechado', async () => {
    const weak = await encryptToken(TOKEN, 'uma frase longa de teste', REPO, 1000)
    expect(accessFileSchema.safeParse(weak).success).toBe(false)
    expect(accessFileSchema.safeParse({ ...weak, iterations: ITERATIONS }).success).toBe(true)
    expect(accessFileSchema.safeParse({ ...weak, iterations: ITERATIONS, token: TOKEN }).success).toBe(false)
  })
})

describe('regras de senha e chave', () => {
  it('exige senha longa e variada', () => {
    expect(passwordProblem('curta')).not.toBeNull()
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).not.toBeNull()
    expect(passwordProblem('minha frase da HF 2026')).toBeNull()
  })

  it('valida o formato da chave do GitHub', () => {
    expect(tokenProblem('')).not.toBeNull()
    expect(tokenProblem('github_pat_ com espaço')).not.toBeNull()
    expect(tokenProblem('senha123')).not.toBeNull()
    expect(tokenProblem(TOKEN)).toBeNull()
  })
})
