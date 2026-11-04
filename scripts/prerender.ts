/**
 * Pré-renderiza a página inicial no HTML final (melhora LCP, SEO e funcionamento sem JS).
 * Executado após `vite build` e `vite build --ssr`.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const indexPath = resolve(root, 'dist/index.html')
const serverEntry = resolve(root, 'dist-ssr/entry-server.js')

const { render } = (await import(pathToFileURL(serverEntry).href)) as { render: () => string }
const template = readFileSync(indexPath, 'utf8')

if (!template.includes('<!--app-html-->')) {
  throw new Error('Marcador <!--app-html--> não encontrado em dist/index.html')
}

const html = render()
writeFileSync(indexPath, template.replace('<!--app-html-->', html))
rmSync(resolve(root, 'dist-ssr'), { recursive: true, force: true })

console.log(`Pré-renderização concluída (${(html.length / 1024).toFixed(1)} KB de HTML).`)
