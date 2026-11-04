# CLAUDE.md — HF Seguros e Benefícios

## Identificação do projeto

**Empresa:** HF Seguros e Benefícios  
**Responsável:** Elias Freitas  
**Segmento:** Corretagem de seguros e benefícios  
**Público-alvo:** B2B e B2C  
**Objetivos:** geração de leads, apresentação institucional e divulgação do portfólio.

## Serviços obrigatórios

O site deve apresentar quatro especialidades principais:

1. Planos de Saúde.
2. Planos Odontológicos.
3. Seguro Saúde.
4. Seguros Agrícolas.

Não acrescentar outros produtos sem autorização.

## Diferenciais

Apresentar os oito diferenciais informados no briefing:

1. Mais soluções em um só lugar.
2. Mais de 40 operadoras no portfólio.
3. Soluções personalizadas.
4. Foco no melhor custo-benefício.
5. Atendimento próximo e consultivo.
6. Especialização no mercado empresarial.
7. Proteção para quem produz.
8. Atuação em todo o Brasil.

Não inventar estatísticas, avaliações, certificações ou parcerias.

## Direção visual

Criar uma landing page premium inspirada na linguagem de interfaces digitais modernas, especialmente plataformas SaaS com estética editorial.

Referência conceitual: Tessera — Task & Reward Platform Web Design.

O layout deve apresentar:
- Hero de grande impacto.
- Tipografia contemporânea.
- Composição visual assimétrica.
- Cards com hierarquia sofisticada.
- Blocos de interface cuidadosamente organizados.
- Botões destacados.
- Espaçamentos generosos.
- Microinterações discretas.
- Identidade visual consistente.

A referência é visual, não funcional. Não criar um sistema de tarefas, recompensas, pontos ou gamificação.

A identidade visual oficial enviada pelo cliente prevalece sobre sugestões de cores.

Evitar vermelho, roxo, rosa e amarelo muito destacado.

## Estrutura do site

Implementar:

1. Header e navegação.
2. Hero institucional.
3. Seletor de quatro especialidades.
4. Apresentação institucional.
5. Diferenciais.
6. Soluções para pessoas e empresas.
7. Depoimentos, somente se autorizados e fornecidos.
8. Contato e captação de leads.
9. Footer.

A estrutura deve ser definida em componentes fixos.

Não permitir ao administrador criar ou excluir seções.

## Tecnologia

- React.
- Vite.
- TypeScript.
- CSS modularizado.
- Zod.
- Vitest.
- Playwright.
- GitHub Pages.
- Arquivos JSON versionados.

Sem backend próprio e sem banco de dados.

## Painel administrativo

Criar rota `/admin/`.

Permitir exclusivamente:
- Editar textos existentes.
- Substituir imagens existentes.
- Alterar cores autorizadas.

Proibir:
- Criar seções.
- Excluir seções.
- Criar páginas.
- Adicionar cards.
- Remover itens.
- Alterar HTML.
- Alterar CSS manualmente.
- Inserir scripts.
- Alterar funcionalidades.

Utilizar schema fechado.

## Segurança

Não inserir senhas ou tokens em código público.

Não criar autenticação fictícia.

Não utilizar localStorage como armazenamento definitivo.

Não confiar em uma senha verificada exclusivamente no frontend para proteger conteúdo sensível.

Publicação via GitHub somente com mecanismo de autorização adequado.

Validar conteúdo e imagens antes da publicação.

## Formulário de contato

O briefing menciona formulário com envio ao WhatsApp, mas a opção selecionada precisa ser confirmada.

Se aprovado:
- Criar formulário curto.
- Solicitar somente informações necessárias.
- Permitir selecionar a especialidade.
- Gerar mensagem para WhatsApp.
- Não prometer envio automático sem integração real.
- Não coletar informações médicas sensíveis.

## SEO

Implementar:
- Metadados.
- HTML semântico.
- Open Graph.
- Sitemap.
- Robots.txt.
- Canonical.
- Dados estruturados quando verificáveis.
- SEO local e nacional conforme informações confirmadas.

## Acessibilidade e performance

- WCAG AA.
- Mobile-first.
- Imagens otimizadas.
- Navegação por teclado.
- Core Web Vitals.
- Respeitar prefers-reduced-motion.

## Regras de execução

Antes de cada alteração:
1. Ler CLAUDE.md.
2. Verificar requisitos.
3. Analisar código existente.
4. Implementar.
5. Testar.
6. Corrigir.
7. Documentar.

Não considerar o projeto concluído sem testes e auditoria final.