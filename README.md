# Que Fome!

Projeto React + Vite com backend REST NestJS/TypeScript em migração gradual.

**Para começar sem banco de dados**, veja **[MIGRACAO-NESTJS.md](./MIGRACAO-NESTJS.md)**. O backend pode consumir o arquivo TACO local antes de configurar PostgreSQL/Supabase.

- Frontend: pasta `src/` (`npm install && npm run dev`, na raiz).
- Backend: pasta `backend/src/` (`cd backend && npm install && npm run dev`).
- Dados de desenvolvimento: `backend/data/taco/TACO.json`.
- Persistência futura: `supabase/migrations/` e `backend/scripts/importar-taco.ts`.

Nesta fase, apenas o módulo **alimentos/nutrição** foi migrado para a API. Receitas, favoritos e autenticação seguem no frontend até as próximas etapas.

## Integração com Supabase + RapidAPI

Para configurar as duas fontes sem expor senhas no frontend, consulte [CONECTAR-SUPABASE-E-RAPIDAPI.md](CONECTAR-SUPABASE-E-RAPIDAPI.md). Nesta etapa o backend oferece duas rotas de consulta independentes e o React escolhe uma delas por `VITE_ALIMENTOS_SOURCE`.

## Docker

```bash
docker compose up --build   # abre em http://localhost:8080
```

Opcional: copie `.env.example` para `.env` para configurar Supabase/RapidAPI. Sem isso, o app sobe com os alimentos do arquivo TACO local.
