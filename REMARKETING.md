# Leads e remarketing

## Consentimento
O contato da simulação continua obrigatório; marketing é opcional, desmarcado por padrão e não bloqueia atendimento, PDF ou WhatsApp. `consentimento_marketing` aceita somente booleano; omissão significa falso. O servidor registra texto, versão 2 e horário da autorização. Repetir `request_id` retorna a simulação original sem alterar consentimento.

## Turso V4
Sem migrações, colunas novas ou mudanças em `database.ts`. A coluna `consent` mantém `accepted`, `at`, `policy` e acrescenta `text` e `marketing: {accepted, at, policy, text}`. A coluna `data` e o payload do webhook recebem os campos de marketing e atribuição. Leads antigos sem `marketing.accepted === true` não são exportados.

UTMs (`source`, `medium`, `campaign`, `content`, `term`, `id`) e `fbclid/gclid/gbraid/wbraid/ttclid` são capturados do endereço e preservados na sessão. Somente esses campos são aceitos, com até 500 caracteres. Dados arbitrários de tracking não podem sobrescrever nome, consentimento ou simulação. Navegadores que bloqueiam sessionStorage continuam funcionando.

## Painel e CSV
Entre em `/admin` com a senha existente. O painel mostra e-mail e status de marketing. “Exportar CSV de marketing” baixa `/api/export`, usando o mesmo cookie HttpOnly de sessão admin. Não há token público ou nova credencial. Sem sessão válida, a rota retorna 403; somente GET é aceito. A resposta não é armazenada em cache.

A exportação inclui todos os contatos autorizados (não apenas os 500 do painel ou resultados da pesquisa), com contato, cidade, conta, status, prova do consentimento e atribuição. CSV UTF-8 com BOM, aspas e proteção contra fórmulas de planilhas. Trate o arquivo como dados pessoais e restrinja seu acesso. A exportação não envia contatos automaticamente para plataformas.

## Revogação e operação
Antes de importar em campanhas, confirme autorizações atuais. Para revogar, a equipe deve atualizar `consent.marketing.accepted` para false e `data.consentimento_marketing` para false por ferramenta administrativa segura; não há tela de revogação nesta versão. Registre a data e retire o contato dos públicos, CSVs e integrações já usados. Excluir pelo painel remove o registro local e seus vínculos; remova também cópias externas. Não use listas antigas após revogação.

Revise o texto institucional configurável em `/admin` para evitar conflito com a política versão 2 e mantenha o canal de atendimento da Renovo atualizado. Defina operacionalmente o prazo de retenção e remova dados que não sejam mais necessários.

## Validação e deploy
`npm ci`, `npm test`, `npm run build`. As variáveis existentes de Turso, sessão e integrações continuam iguais. O arquivo `api/export.ts` integra a rota às funções da Vercel, sem nova configuração de rewrite.
