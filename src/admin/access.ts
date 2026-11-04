import { z } from 'zod'

/*
 * Acesso ao painel (exceção aprovada pelo responsável, registrada no CLAUDE.md).
 *
 * A chave do GitHub (token fine-grained, restrito a este repositório) fica em
 * public/admin/acesso.json CIFRADA com a senha do painel: AES-256-GCM com chave
 * derivada por PBKDF2-SHA256 (600 mil iterações) e o nome do repositório como dado
 * autenticado. A senha não está em lugar nenhum; o token só existe em memória
 * durante a sessão.
 *
 * Limite conhecido: o arquivo cifrado é público. A segurança depende de uma senha
 * longa — por isso o mínimo de 12 caracteres.
 */

export const ITERATIONS = 600_000
export const MIN_PASSWORD_LENGTH = 12
export const ACCESS_FILE_PATH = 'public/admin/acesso.json'

const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'base64 inválido').max(4096)

export const accessFileSchema = z.strictObject({
  v: z.literal(1),
  kdf: z.literal('PBKDF2-SHA256'),
  iterations: z.number().int().min(ITERATIONS),
  salt: base64,
  iv: base64,
  data: base64,
})

export type AccessFile = z.infer<typeof accessFileSchema>

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Cifra o token. `iterations` só deve ser reduzido em testes. */
export async function encryptToken(token: string, password: string, repository: string, iterations = ITERATIONS): Promise<AccessFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, iterations)
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(repository) },
    key,
    encoder.encode(token),
  )
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(data)),
  }
}

/** Retorna o token ou null se a senha estiver errada (ou o arquivo for de outro repositório). */
export async function decryptToken(file: AccessFile, password: string, repository: string): Promise<string | null> {
  try {
    const key = await deriveKey(password, base64ToBytes(file.salt), file.iterations)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(file.iv), additionalData: encoder.encode(repository) },
      key,
      base64ToBytes(file.data),
    )
    return decoder.decode(plain)
  } catch {
    return null
  }
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres (de preferência uma frase).`
  if (new Set(password).size < 5) return 'A senha é muito repetitiva. Use uma frase ou combinação mais variada.'
  return null
}

export function tokenProblem(token: string): string | null {
  if (!token) return 'Cole a chave de acesso do GitHub.'
  if (/\s/.test(token)) return 'A chave não pode ter espaços.'
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) return 'Formato de chave do GitHub não reconhecido (começa com github_pat_).'
  return null
}
