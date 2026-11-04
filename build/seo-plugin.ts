import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import type { SiteContent, Settings } from '../src/content/schema.ts'

const THEME_MODULE = 'virtual:hf-theme.css'
const RESOLVED_THEME_MODULE = '\0hf-theme.css'

interface Options {
  /** URL pública absoluta do site, terminando em "/". */
  siteUrl: string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** JSON seguro para <script type="application/ld+json">. */
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')

const CSP_SITE = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

// O painel conversa somente com a API oficial do GitHub, além da própria origem.
const CSP_ADMIN = CSP_SITE.replace("frame-src 'none'", "frame-src 'self'").replace(
  "connect-src 'self'",
  "connect-src 'self' https://api.github.com",
)

export function hfSeoPlugin({ siteUrl }: Options): Plugin {
  let config: ResolvedConfig
  const contentDir = resolve(import.meta.dirname, '../src/content')
  const read = <T>(file: string): T => JSON.parse(readFileSync(resolve(contentDir, file), 'utf8')) as T

  return {
    name: 'hf-seo',
    configResolved(resolved) {
      config = resolved
    },
    resolveId(id) {
      if (id === THEME_MODULE) return RESOLVED_THEME_MODULE
    },
    load(id) {
      if (id !== RESOLVED_THEME_MODULE) return
      this.addWatchFile(resolve(contentDir, 'site.json'))
      const { theme } = read<SiteContent>('site.json')
      return `:root{--brand:${theme.brand};--brand-deep:${theme.brandDeep};--accent:${theme.accent};--surface-tint:${theme.surfaceTint}}`
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const isBuild = config.command === 'build'
        const isAdmin = ctx.path.includes('/admin/')
        const content = read<SiteContent>('site.json')
        const settings = read<Settings>('settings.json')
        const tags: string[] = []

        if (isBuild) tags.push(`<meta http-equiv="Content-Security-Policy" content="${isAdmin ? CSP_ADMIN : CSP_SITE}">`)
        tags.push('<meta name="referrer" content="strict-origin-when-cross-origin">')

        if (isAdmin) {
          tags.push(`<title>Painel de conteúdo · ${escapeHtml(settings.siteName)}</title>`)
          tags.push('<meta name="robots" content="noindex, nofollow">')
          return html.replace('<!--hf-head-->', tags.join('\n    '))
        }

        const ogImage = `${siteUrl}images/og-image.jpg`
        const sameAs = settings.social.map((s) => s.url).filter(Boolean)
        const structuredData = {
          '@context': 'https://schema.org',
          '@type': 'InsuranceAgency',
          name: settings.siteName,
          url: siteUrl,
          description: content.meta.description,
          image: ogImage,
          areaServed: { '@type': 'Country', name: 'Brasil' },
          knowsAbout: content.services.items.map((s) => s.name),
          ...(sameAs.length ? { sameAs } : {}),
        }

        tags.push(
          `<title>${escapeHtml(content.meta.title)}</title>`,
          `<meta name="description" content="${escapeHtml(content.meta.description)}">`,
          `<link rel="canonical" href="${siteUrl}">`,
          '<meta name="robots" content="index, follow, max-image-preview:large">',
          '<meta property="og:type" content="website">',
          '<meta property="og:locale" content="pt_BR">',
          `<meta property="og:site_name" content="${escapeHtml(settings.siteName)}">`,
          `<meta property="og:title" content="${escapeHtml(content.meta.title)}">`,
          `<meta property="og:description" content="${escapeHtml(content.meta.description)}">`,
          `<meta property="og:url" content="${siteUrl}">`,
          `<meta property="og:image" content="${ogImage}">`,
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          `<meta property="og:image:alt" content="${escapeHtml(content.meta.ogImageAlt)}">`,
          '<meta name="twitter:card" content="summary_large_image">',
          `<meta name="twitter:title" content="${escapeHtml(content.meta.title)}">`,
          `<meta name="twitter:description" content="${escapeHtml(content.meta.description)}">`,
          `<meta name="twitter:image" content="${ogImage}">`,
          `<script type="application/ld+json">${safeJson(structuredData)}</script>`,
        )

        // Pré-carrega apenas o subconjunto latino da fonte variável (o usado no conteúdo).
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /plus-jakarta-sans-latin-wght-normal.*\.woff2$/.test(f))
        if (font) tags.push(`<link rel="preload" href="${config.base}${font}" as="font" type="font/woff2" crossorigin>`)

        return html.replace('<!--hf-head-->', tags.join('\n    '))
      },
    },
    generateBundle() {
      if (config.build.ssr) return
      const base = config.base
      const today = new Date().toISOString().slice(0, 10)
      const settings = read<Settings>('settings.json')

      // O painel consulta este arquivo para confirmar que o commit publicado já está no ar.
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify({ commit: process.env.GITHUB_SHA ?? 'local', builtAt: new Date().toISOString() })}\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: ${base}admin/\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${siteUrl}</loc><lastmod>${today}</lastmod></url>\n` +
          '</urlset>\n',
      })
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Página não encontrada · ${escapeHtml(settings.siteName)}</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#F7FAFB;color:#0B212E;padding:24px}
main{max-width:480px;text-align:center}
h1{font-size:2rem;margin:0 0 12px}
a{display:inline-block;margin-top:16px;padding:14px 24px;border-radius:999px;background:#255063;color:#fff;text-decoration:none;font-weight:600}
a:focus-visible{outline:3px solid #DB7D1B;outline-offset:3px}
</style>
</head>
<body>
<main>
<h1>Página não encontrada</h1>
<p>O endereço acessado não existe ou foi alterado.</p>
<a href="${base}">Voltar ao início</a>
</main>
</body>
</html>
`,
      })
    },
  }
}
