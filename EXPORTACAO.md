# Checklist para publicar

1. Instale Node 22/24.
2. Extraia o projeto.
3. Execute `npm install` e `npm run build`.
4. Teste com `npm run dev`.
5. Crie o banco libSQL/Turso e configure URL/token na Vercel.
6. Configure ADMIN_PASSWORD e SESSION_SECRET; mantenha os segredos no servidor.
7. Importe o repositório na Vercel como Vite, output `dist`.
8. Teste um lead, os dois botões, login /admin e persistência após recarregar.

O código da última versão do Site está no ZIP. O ZIP não inclui banco com contatos de clientes nem credenciais privadas. O site original não é apagado ao extrair ou publicar esta cópia.
