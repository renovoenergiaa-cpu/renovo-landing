# Renovo — Simulador Solar independente

Cópia do projeto Renovo, convertida para **React + Vite + TypeScript**, com APIs Node.js compatíveis com a Vercel. Sem Next.js, Vinext, Cloudflare Workers/D1, credenciais Sites ou login ChatGPT.

## Rodar no computador

Use Node.js 22.13 ou superior (Node 22/24) e npm.

```bash
npm install
npm run build
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:5173`). `npm run dev` inicia o Vite e a API local na porta 3001. Não precisa de conta externa para testar o simulador: o banco SQLite é criado em `.data/renovo.sqlite` na primeira requisição.

Para usar o painel administrativo, copie `.env.example` para `.env` e preencha `ADMIN_PASSWORD` (mínimo 12 caracteres) e `SESSION_SECRET` (mínimo 32 caracteres aleatórios). Reinicie o servidor e abra `/admin`. Nunca use senhas de exemplo em produção.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Para executar a versão compilada com APIs locais:

```bash
npm run build
npm start
```

Abra `http://localhost:3001`. `npm run preview` oferece somente a prévia estática; para PDF, gravação de leads e APIs, use `npm start` ou `npm run dev`.

## Publicar na Vercel

1. Extraia o ZIP e coloque o conteúdo de `renovo-vercel/` em um repositório Git.
2. Na Vercel, importe esse repositório. Se o diretório estiver dentro de outro repositório, escolha `renovo-vercel` como Root Directory.
3. Framework: **Vite**. Install Command: **npm install**. Build Command: **npm run build**. Output Directory: **dist**. Selecione Node.js 22 ou 24.
4. Crie um banco remoto libSQL/Turso e obtenha URL e token. Configure as variáveis abaixo em Settings → Environment Variables.
5. Faça o deploy. As rotas `api/*.ts` são as funções de servidor. `vercel.json` mantém `/admin` e `/privacidade` acessíveis como rotas da aplicação.
6. Faça uma simulação de teste no domínio final: conferir captura, PDF e destino do WhatsApp.

Variáveis necessárias na Vercel:

| Variável | Uso |
| --- | --- |
| `TURSO_DATABASE_URL` | URL do banco remoto libSQL/Turso, normalmente `libsql://...` |
| `TURSO_AUTH_TOKEN` | Token de acesso ao banco — segredo |
| `ADMIN_PASSWORD` | Senha exclusiva do painel — segredo, mínimo 12 caracteres |
| `SESSION_SECRET` | Chave de assinatura das sessões — segredo, mínimo 32 caracteres |
| `RENOVO_WHATSAPP` | `5515991699585` (já é o padrão do código) |

O schema é criado automaticamente na primeira requisição; `npm run db:init` permite inicializá-lo manualmente com as variáveis configuradas. O script cria tabelas/indexes sem apagar registros existentes. Novas mudanças de schema devem usar migrações adicionais.

**Na Vercel, o banco remoto é obrigatório.** O modo SQLite local é somente para desenvolvimento ou um servidor próprio com disco persistente. Sem URL remota, a API mostra um erro de configuração; o build do frontend continua funcionando.

As variáveis não precisam de prefixo `VITE_`; segredos pertencem exclusivamente ao servidor. Não inclua `.env` no Git nem em `public/`. Não coloque `TURSO_AUTH_TOKEN`, senhas ou tokens no navegador.

Opcional: `APP_URL` fixa a origem canônica usada pelo servidor. Deixe vazio para previews com endereços diferentes; o servidor usa o host da requisição. Se definido, deve ser o domínio acessado pelos visitantes.

## O que foi preservado

- Mesmos componentes visuais, CSS, tipografia, textos, cores, espaçamentos e breakpoints responsivos. `src/Home.tsx` e `src/styles.css` foram copiados sem alteração do último Site.
- Hero da Renovo e wizard com seis etapas; a etapa monofásico/bifásico/trifásico continua removida.
- Valores BRL, escolhas em cards, progresso, retorno sem perder respostas, consulta de CEP e correção manual.
- Nome, WhatsApp com máscara, e-mail opcional e consentimento registrado com data/hora.
- Tela final sem valores ou dados: apenas confirmação, botão PDF e botão WhatsApp.
- PDF nativo para download, com fontes incorporadas, dados preenchidos, quantidade de placas e inversores, geração/economia, preço e equipamentos sem marcas.
- WhatsApp da Renovo `(15) 99169-9585`, com todas as respostas e resumo; o cliente confirma o envio da mensagem no aplicativo. O PDF não é anexado automaticamente.
- Tabela de geração, interpolação para painéis ímpares e preço: seis placas por R$ 10.990, mais R$ 1.000 por placa adicional.
- Leads/simulações, painel de configurações e equipamentos, busca por código, exclusão, eventos, UTMs/fbclid, API de status e entrega/reenvio de webhook opcional.
- Hooks de tracking e WebMCP com feature detection. Pixel/CAPI não são ativados automaticamente, assim como no Site de origem.

**Diferença necessária de plataforma:** o painel usa login por senha própria com cookie HttpOnly/SameSite, em vez de login ChatGPT/allowlist. D1 foi substituído por SQLite/libSQL. Os dados de leads já armazenados no Site e credenciais externas não estão neste ZIP; a nova base começa vazia. Os defaults comerciais, número e conteúdo de código estão preservados. Se você alterou configurações diretamente no painel, confira/reaplique na nova instalação.

## Calculadora

`server/lib/calculator.ts` é a fonte das regras:

| Painéis | Geração mensal estimada (kWh) |
| --- | ---: |
| 6 | 406 |
| 8 | 541 |
| 10 | 677 |
| 12 | 812 |
| 14 | 947 |
| 16 | 1.083 |
| 18 | 1.218 |
| 20 | 1.353 |

Quantidades ímpares usam interpolação. Acima de 20, usa-se a diferença entre 18 e 20 para extrapolar. A seleção cobre o consumo mensal estimado pela conta/tarifa. A tarifa inicial é R$ 0,95/kWh, editável no painel. O preço inicial é R$ 10.990 + R$ 1.000 por painel acima de seis. Valores são pré-propostas sujeitas a análise técnica. Potência do módulo, capacidade de referência dos inversores, compensação e hipóteses de economia acumulada continuam configuráveis.

## Estrutura

```text
src/                  React, componentes, CSS e utilitários de interface
public/               Logo, favicon e demais assets originais
server/routes/        Simulação, PDF, WhatsApp, CEP, admin, status, auth, configuração
server/lib/           Calculadora, PDF/fontes, banco, autenticação, webhook
server/db/            Schema SQL e versão embutida para inicialização
api/                  Entradas Node.js para Vercel
scripts/              Desenvolvimento local e inicialização do banco
tests/                Verificações de integração
vercel.json           Funções e roteamento
.env.example          Lista de configurações
package-lock.json     Versões reproduzíveis para npm
```

## Integrações opcionais

O fluxo PDF/WhatsApp funciona sem n8n/WAHA. Para envio ao n8n, configure `N8N_WEBHOOK_URL` e, se aplicável, `N8N_WEBHOOK_SECRET` como Bearer. O painel também permite cadastrar a URL. O lead é salvo antes do envio; falhas ficam em `webhook_outbox`. Reenvie pelo painel ou pela API de automação.

`POST /api/status`, com `Authorization: Bearer AUTOMATION_API_TOKEN`, aceita atualização de status (`qualificado`, `proposta_enviada`, `vendido` etc.) ou `{ "action": "retry" }`. `GET /api/status?lead_id=SOL-...` requer o mesmo token para consultar dados. Mantenha esse token e credenciais do WAHA no servidor/n8n. O payload inclui `notificacao_renovo`, e os IDs de eventos são determinísticos para deduplicação. Não há mais necessidade de credencial de serviço do Sites.

O site preserva atribuição da visita no sessionStorage e os hooks `fbq` da origem. Não instala nem envia Meta Pixel/CAPI por padrão. Para ativação, configure a integração e consentimento adequado separadamente. As variáveis META_* são preparação, não integração já ativa.

## Segurança e privacidade

Entradas validadas no backend; cálculo refeito no servidor; SQL parametrizado; limitação de tentativas; sessão assinada com expiração em 12 horas; cookie HttpOnly/SameSite=Strict (Secure em HTTPS/Vercel); verificação de origem em mutações. Rotacionar `SESSION_SECRET` invalida sessões antigas.

A política de privacidade é editável no painel. Revise responsável, contato de direitos e retenção antes de divulgação. A exclusão remove dados do banco local/remoto desta aplicação; registros enviados a serviços externos precisam ser excluídos nesses serviços também.

## Verificação desta exportação

`npm install`, `npm run build` e `npm test` passaram. Testes cobrem tabela/preços, limites, consentimento, captura, UTMs, idempotência, login e sessão, painel protegido, PDF como formulário POST real, mensagem WhatsApp, status autenticado, deduplicação, origem e exclusão. Home e CSS foram comparados byte a byte com a última versão do Site.

Não foi realizado deploy na conta Vercel nem conexão com banco Turso real, pois não foram fornecidas credenciais. Esses dois pontos exigem validação na sua instalação. O navegador/dispositivo pode escolher baixar ou abrir o PDF conforme suas preferências; o servidor entrega um PDF real com `Content-Disposition: attachment`.

## Referências técnicas

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/runtimes/node-js
- https://docs.turso.tech/sdk/ts/quickstart

Licença das fontes PDF: `server/lib/pdf-font-license.txt`. Dependências de código aberto mantêm suas próprias licenças. A identidade e conteúdo Renovo permanecem pertencentes à empresa.
