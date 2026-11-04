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
| `npm run images:placeholders` | Regera as composições gráficas (seção institucional e compartilhamento) com cores e logotipo oficiais. |
| `npm run brand:assets` | Gera logotipos WebP e favicons a partir dos originais em `idvisual/`. |
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

### Acesso por senha

O painel abre somente com senha (mesmo modelo dos projetos Weiri e Conecta; exceção registrada no CLAUDE.md).
A senha destrava uma **chave do GitHub** guardada em `public/admin/acesso.json` **cifrada** (AES-256-GCM,
PBKDF2-SHA256 com 600 mil iterações). A senha não está escrita em nenhum arquivo e a chave fica apenas na memória
da aba durante o uso — nada é salvo no navegador.

**Configurar (uma vez, por quem mantém o site):**

1. GitHub (conta dona do repositório) › Settings › Developer settings › Personal access tokens ›
   **Fine-grained tokens** › Generate new token.
2. *Repository access*: **Only select repositories** › `hfbeneficios`.
3. *Repository permissions*: **Contents: Read and write**. Nenhuma outra permissão. Anote a data de expiração.
4. Abra `/admin/`, cole a chave, defina a senha da cliente (mínimo de 12 caracteres; prefira uma frase) e salve.
   O painel grava o `acesso.json` cifrado no repositório. Passe apenas a **senha** para a cliente.

- Trocar a senha: dentro do painel, em **Acesso**.
- Chave venceu ou foi revogada: na tela de entrada, **Reconfigurar acesso** (exige uma chave nova e válida).
- Risco aceito: o arquivo cifrado é público; uma senha curta pode ser descoberta por tentativa offline e daria
  permissão de escrita no repositório (exceto workflows). Use senha longa e chave com o menor escopo possível.

### Publicar (para a cliente)

1. Entre com a senha, edite e confira em **Pré-visualização** (o site real nos tamanhos celular/tablet/computador).
2. Em **Publicar**, revise a lista de alterações e toque em **Publicar no site**.
3. O painel envia tudo em **um único commit** na `main` ("Painel: atualização de conteúdo…"), grava apenas
   `src/content/site.json` e as imagens de `public/images/`, e avisa quando o site já está no ar (cerca de 1 a 2 min).

Se outra pessoa publicou depois que você entrou, o painel recusa a publicação em vez de sobrescrever. O deploy
revalida o conteúdo no build; conteúdo inválido não chega ao ar. O rascunho fica no `localStorage` apenas como
conveniência; a seção **Cópia de segurança** baixa/importa o `site.json`.

Para quem mantém o código: cada publicação do painel vira um commit na `main`. Rode `git pull` antes de enviar
alterações feitas no computador. Não edite `public/admin/acesso.json` à mão.

## Deploy no GitHub Pages

Repositório: `Tha-github/hfbeneficios` — site em https://tha-github.github.io/hfbeneficios/.

1. *Settings › Pages › Source*: **GitHub Actions** (já feito).
2. *Settings › Branches/Rules*: em `main`, bloqueie **force push** e **exclusão**. **Não** exija Pull Request:
   o painel publica direto na `main`, e essa exigência bloquearia a publicação.
3. Configure o acesso do painel (seção acima).
4. Domínio próprio (quando houver): configure em *Settings › Pages*. `SITE_URL` e `BASE_PATH` são obtidos
   automaticamente de `actions/configure-pages`, então canonical, sitemap e Open Graph acompanham.

Observação: em endereços `usuario.github.io/repositorio/`, o `robots.txt` não fica na raiz do domínio e os
buscadores o ignoram. O painel continua protegido por `noindex`; com domínio próprio, o `robots.txt` passa a valer.

## Segurança

- Painel por senha que destrava uma chave do GitHub cifrada (ver "Acesso por senha"); a chave só existe em memória,
  com escopo restrito a este repositório e "Contents"; o painel só grava arquivos de conteúdo, em um único commit.
  A CSP do painel só permite conexões com a própria origem e `api.github.com`.
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

- [x] **Identidade visual oficial** aplicada a partir de `idvisual/`: azul-petróleo `#255063` (botões e links),
      `#0B212E` (textos e seções escuras), laranja `#DB7D1B` (destaques, sempre com texto na cor profunda — o
      laranja não tem contraste AA com texto branco) e fundo `#EEF4F6`; logotipo horizontal e símbolo oficiais.
- [ ] **Confirmar o nome exibido**: o logotipo diz “Honorato Freitas Benefícios”, enquanto os textos do site usam
      “HF Seguros e Benefícios”.
- [x] Tipografia: títulos em **Century Gothic** (fonte do logotipo), usada **somente se instalada no aparelho do
      visitante** — os arquivos da Monotype não são publicados, pois a cópia do cliente (Windows/Office) não cobre
      uso web. Sem ela, os títulos usam **Jost** (OFL, hospedada no site). Textos corridos em Plus Jakarta Sans.
      Para o visual idêntico em todos os aparelhos, o cliente pode adquirir a licença web da Century Gothic.
      *Champagne & Limousines* (só uso pessoal; web exige autorização da autora) e *Big Noodle Titling* (livre,
      condensada) não foram usadas.
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
