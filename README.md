# HF Seguros e Benefícios — site institucional

Landing page de geração de leads da HF Seguros e Benefícios (responsável: Elias Freitas), com painel de
conteúdo em `/admin/`. Site estático em React + Vite + TypeScript, publicado no GitHub Pages, sem backend
e sem banco de dados. Regras do projeto: [CLAUDE.md](CLAUDE.md).

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências (Node 22, ver `.nvmrc`). |
| `npm run dev` | Servidor de desenvolvimento (`/` e `/admin/`). |
| `npm run build` | Valida o conteúdo, checa tipos, gera o build e pré-renderiza a página inicial em `dist/`. |
| `npm run preview` | Serve o build em `http://localhost:4173`. |
| `npm run lint` | ESLint (inclui proibição de `dangerouslySetInnerHTML`). |
| `npm test` | Testes unitários (Vitest). |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) contra o build; rode `npm run build` antes. |
| `npm run validate:content` | Valida `site.json`, `settings.json` e as imagens (o mesmo que o CI executa). |
| `npm run images:placeholders` | Regera as imagens provisórias a partir das cores da marca. |
| `npm run check` | Lint + unitários + build + E2E. |

## Estrutura

```
index.html, admin/index.html     Páginas (o painel é uma segunda entrada do Vite)
build/seo-plugin.ts              Metadados, Open Graph, JSON-LD, CSP, sitemap, robots, 404 e tema
scripts/                         Validação de conteúdo, pré-renderização e imagens provisórias
src/content/
  site.json                      Conteúdo editável pelo painel (textos, alt das imagens, 4 cores)
  settings.json                  Configurações técnicas (WhatsApp, redes, repositório) — só desenvolvedor
  schema.ts                      Schema Zod FECHADO + regras de cor
src/site/                        Site público (componentes fixos, CSS Modules)
src/admin/                       Painel de conteúdo
public/images/                   sobre.webp e og-image.jpg (únicos espaços de imagem)
tests/unit, tests/e2e            Vitest e Playwright
.github/workflows/               CI de Pull Requests e deploy no GitHub Pages
```

Ordem fixa das seções: Header → Hero → Seletor de especialidades (abas com as 4 especialidades e o detalhe de
cada uma) → Sobre → Diferenciais → Para quem (pessoas, empresas, produtores rurais) → Depoimentos (desativada) →
Contato/cotação → Rodapé.

## Painel `/admin/` e publicação

O painel permite **somente** editar textos existentes, substituir as duas imagens existentes (com seu texto
alternativo) e alterar as quatro cores autorizadas. Não há operação de criar/remover seções, itens ou páginas, e
o schema fechado rejeita qualquer alteração estrutural, HTML ou script — no painel, no build e no CI.

**Não existe login no painel, e isso é intencional.** Ele não guarda segredos e não grava nada no site: apenas
gera arquivos validados. A autorização acontece no GitHub:

1. No painel, edite, confira em **Pré-visualização** (o site real em iframe, nos tamanhos celular/tablet/computador)
   e abra **Publicar**.
2. Baixe `site.json` (e as imagens substituídas, já convertidas e com o nome correto).
3. No GitHub, substitua `src/content/site.json` (e/ou envie as imagens para `public/images/`) e escolha
   *Create a new branch for this commit and start a pull request*.
4. O CI valida schema, imagens, lint, testes e build. Após revisão e merge em `main`, o deploy é automático.

O rascunho fica no `localStorage` do navegador apenas como conveniência (não é armazenamento definitivo;
imagens não ficam no rascunho). Com `repository` preenchido em `settings.json`, o painel mostra links diretos
para o editor e o upload do GitHub.

## Deploy no GitHub Pages

1. Crie o repositório da HF (não usar o repositório Conecta Soluções) e envie este projeto.
2. *Settings › Pages › Source*: **GitHub Actions**.
3. *Settings › Branches*: proteja `main` exigindo Pull Request, aprovação e o check **CI / verify**.
4. Preencha `repository` (`owner/repositorio`) em `src/content/settings.json`.
5. Domínio próprio (quando houver): configure em *Settings › Pages*. `SITE_URL` e `BASE_PATH` são obtidos
   automaticamente de `actions/configure-pages`, então canonical, sitemap e Open Graph acompanham.

Observação: em endereços `usuario.github.io/repositorio/`, o `robots.txt` não fica na raiz do domínio e os
buscadores o ignoram. O painel continua protegido por `noindex`; com domínio próprio, o `robots.txt` passa a valer.

## Segurança

- Sem senhas, tokens ou autenticação simulada no código; a publicação depende das permissões do GitHub.
- Schema fechado: objetos estritos, listas de tamanho fixo, IDs e caminhos de imagem literais; textos sem `<`, `>`,
  caracteres de controle/bidirecionais ou `javascript:`/`data:`. React escapa todo texto e o lint proíbe HTML injetado.
- Imagens: tipo declarado + assinatura real conferidos, decodificadas e **re-codificadas** via canvas (remove
  metadados e conteúdo embutido), dimensões e peso fixos; SVG não é aceito. O CI recusa arquivos extras em `public/images/`.
- Prévia: o site só aceita `postMessage` da janela-mãe na mesma origem e revalida o conteúdo com o schema.
- CSP via meta (`script-src 'self'`, `style-src 'self'`, `object-src 'none'`, sem terceiros); cores aplicadas via CSSOM.
- Links externos com `noopener noreferrer`; redes sociais só em domínios permitidos e com `https`.
- Workflows com permissões mínimas (`contents: read`; `pages`/`id-token` apenas no job de deploy),
  `persist-credentials: false`, Dependabot para npm e Actions, `npm audit` no CI.

## Pendências (dependem do cliente)

- [ ] **Identidade visual oficial** (logotipo e cores). A paleta atual (azul `#1F4FD8`, marinho `#0B1B3F`,
      verde-petróleo `#0F766E`) e a assinatura “HF” são provisórias.
- [ ] **Confirmar o formulário com envio ao WhatsApp** e informar o número (`whatsappNumber` em
      `settings.json`, formato `55DDDNUMERO`). Até lá, o formulário informa que o canal está em configuração.
- [ ] **Confirmar plataformas e URLs** de `@hfbeneficios.mt` e `@hfbeneficios` (`social` em `settings.json`).
      Sem URL confirmada, nada é exibido.
- [ ] **Fotos oficiais** para a seção institucional e a imagem de compartilhamento (hoje: composições gráficas provisórias).
- [ ] **Depoimentos**: seção desativada; só ativar com depoimentos reais, fornecidos e autorizados por escrito.
- [ ] **Dados legais** (razão social, CNPJ, registro SUSEP do corretor) para o rodapé e para os dados estruturados.
- [ ] **Política de privacidade/LGPD** completa (hoje há apenas um aviso curto no formulário).
- [ ] **Repositório e domínio** definitivos da HF.
- [ ] Endereço físico só deve ser incluído (SEO local) se confirmado.
