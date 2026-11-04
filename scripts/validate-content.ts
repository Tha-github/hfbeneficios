/**
 * Validação do conteúdo publicado. Roda no build e no CI de todo Pull Request.
 *
 * Garante que:
 * - site.json e settings.json seguem o schema fechado (sem seções/itens novos ou removidos);
 * - as imagens existentes têm formato real, dimensões e peso esperados;
 * - nenhum arquivo extra foi adicionado às pastas de conteúdo e de imagens.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { IMAGE_SLOTS, sniffImageType } from '../src/content/images'
import { formatIssues, settingsSchema, siteSchema } from '../src/content/schema'

const root = resolve(import.meta.dirname, '..')
const errors: string[] = []

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  } catch (error) {
    errors.push(`${path}: JSON inválido (${(error as Error).message})`)
    return null
  }
}

const site = siteSchema.safeParse(readJson('src/content/site.json'))
if (!site.success) for (const issue of formatIssues(site.error)) errors.push(`site.json › ${issue.path}: ${issue.message}`)

const settings = settingsSchema.safeParse(readJson('src/content/settings.json'))
if (!settings.success) {
  for (const issue of formatIssues(settings.error)) errors.push(`settings.json › ${issue.path}: ${issue.message}`)
}

const allowedContentFiles = new Set([
  'color.ts',
  'images.ts',
  'index.ts',
  'schema.ts',
  'schema-ids.ts',
  'settings.json',
  'site.json',
])
for (const file of readdirSync(resolve(root, 'src/content'))) {
  if (!allowedContentFiles.has(file)) errors.push(`src/content: arquivo não previsto "${file}"`)
}

const allowedImages = new Set(IMAGE_SLOTS.map((slot) => slot.file.replace('images/', '')))
for (const file of readdirSync(resolve(root, 'public/images'))) {
  if (!allowedImages.has(file)) errors.push(`public/images: arquivo não previsto "${file}" (só é permitido substituir imagens existentes)`)
}

for (const slot of IMAGE_SLOTS) {
  const path = resolve(root, 'public', slot.file)
  let bytes: Buffer
  try {
    bytes = readFileSync(path)
  } catch {
    errors.push(`${slot.file}: arquivo ausente`)
    continue
  }
  const realType = sniffImageType(new Uint8Array(bytes.subarray(0, 16)))
  if (realType !== slot.mime) errors.push(`${slot.file}: formato real ${realType ?? 'desconhecido'}, esperado ${slot.mime}`)
  if (statSync(path).size > slot.maxBytes) {
    errors.push(`${slot.file}: ${(statSync(path).size / 1024).toFixed(0)} KB excede o limite de ${slot.maxBytes / 1024} KB`)
  }
  const meta = await sharp(bytes).metadata()
  if (meta.width !== slot.width || meta.height !== slot.height) {
    errors.push(`${slot.file}: ${meta.width}×${meta.height}, esperado ${slot.width}×${slot.height}`)
  }
}

if (errors.length) {
  console.error(`\n✖ Conteúdo inválido (${errors.length} problema(s)):\n`)
  for (const error of errors) console.error(`  • ${error}`)
  console.error('')
  process.exit(1)
}

console.log('✔ Conteúdo, configurações e imagens válidos.')
