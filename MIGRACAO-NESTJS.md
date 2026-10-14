> **Atualização:** este guia descreve a etapa 1. Para conectar simultaneamente o Supabase e a RapidAPI com rotas separadas, siga **CONECTAR-SUPABASE-E-RAPIDAPI.md**.

# Que Fome! — primeira etapa da migração para NestJS + TypeScript

## Escopo concluído no código

- O frontend **continua React + Vite em JS/JSX**, sem conversão desnecessária.
- O novo backend está em `backend/src`, separado em Controller, Service, Repository, DTO e Database.
- O módulo de alimentos funciona em **dois modos** configuráveis:
  - `ALIMENTOS_SOURCE=taco` (padrão): lê o arquivo `backend/data/taco/TACO.json`, sem Supabase, sem RapidAPI e sem credenciais.
  - `ALIMENTOS_SOURCE=postgres`: usa a tabela `public.alimentos` do PostgreSQL/Supabase via `pg`.
- Rotas:
  - `GET /alimentos?busca=morango`: até 8 resultados com `id`, `descricao`, `kcal`.
  - `POST /alimentos/calcular`: calcula energia, macronutrientes e alguns minerais proporcionalmente ao peso; mantém o formato utilizado por `InformacaoNutricional.jsx`.
- `src/services/nutricao.js` agora é um **cliente HTTP** da API NestJS. O frontend nunca lê `DATABASE_URL`.
- `vite.config.js` encaminha `/api` para `localhost:3000` em desenvolvimento.
- **Autenticação, receitas, favoritos e componentes React foram mantidos** para as próximas etapas.

> **IMPORTANTE:** o pacote recebido não tinha a pasta `.git`. Este ZIP não cria branch, não gera commit e não altera o GitHub. Aplique os arquivos apenas dentro da sua branch local. Nenhum banco remoto foi acessado.

## 1. Git — faça primeiro na sua cópia clonada do repositório

Abra a pasta do projeto no VS Code, no repositório que contém `.git`:

```powershell
git status
git switch -c feat/nestjs-alimentos
```

Se já estiver trabalhando em uma branch exclusiva para a migração, não precisa criar outra. Extraia o ZIP atualizado em uma pasta separada e **copie seu conteúdo para o projeto clonado dentro da branch**, preservando a pasta `.git` da sua cópia. Confira `git status` antes de continuar.

## 2. Rodar tudo SEM BANCO, agora

Requer **Node.js 22.12 ou superior** e acesso ao npm para instalar as dependências. Abra dois terminais no VS Code.

**Terminal 1 — backend:**

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

No `backend/.env`, mantenha `ALIMENTOS_SOURCE=taco`. Nenhuma URL de banco é necessária. A API deve escutar em `http://localhost:3000`.

**Terminal 2 — frontend (raiz do projeto):**

```powershell
npm install
npm run dev
```

Abra a URL apresentada pelo Vite (geralmente `http://localhost:5173`). Digite um alimento na tela **Adicionar Receita**. O frontend consulta `GET /api/alimentos?...` e o Vite envia essa requisição para o NestJS.

### Testes rápidos

No navegador:

```text
http://localhost:3000/alimentos?busca=morango
```

Deve aparecer um array JSON com alimentos contendo “morango”.

Com o backend em execução, em outro terminal dentro de `backend`:

```powershell
npm run test:api
npm run typecheck
npm run build
```

`test:api` testa a busca de morango, o cálculo de 100 g do alimento TACO #1 e a rejeição de um peso negativo. Para fazer um POST manual, no PowerShell:

```powershell
Invoke-RestMethod -Method POST -Uri 'http://localhost:3000/alimentos/calcular' -ContentType 'application/json' -Body '{"items":[{"id":1,"grams":100}]}'
```

A estrutura retornada é `{ items: [...], totals: { grams, macros, micros } }`.

**Nota:** a tabela nutricional aparece nas receitas que possuem ingredientes vinculados a IDs TACO e peso preenchido; receitas antigas sem vínculos continuam sem estimativa, como no projeto original.

## 3. Quando tiver acesso ao Supabase

Apenas quando a equipe fornecer a conexão:

1. Verifique se a migration `supabase/migrations/20261006000000_create_alimentos_table.sql` já foi executada. Execute-a **uma vez, se necessário**, no banco correto.
2. Edite `backend/.env`:

```dotenv
ALIMENTOS_SOURCE=postgres
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/postgres?sslmode=require
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

3. Dentro de `backend`, depois de instalar as dependências, importe os dados:

```powershell
npm run import:taco
```

4. Inicie novamente `npm run dev` e execute `npm run test:api`. O controller, service e frontend **não precisam mudar**; o módulo troca apenas o repositório.

A conexão `DATABASE_URL` deve permanecer **somente no backend/.env** (não use `VITE_DATABASE_URL`, não envie credenciais ao GitHub). Caso o banco tenha outra estrutura de tabela, adapte o repositório SQL à migration real.

## 4. Revisão e push (somente branch)

Na raiz do repositório Git:

```powershell
npm run build
cd backend
npm run typecheck
npm run build
cd ..
git status
git add .
git commit -m "feat: cria API NestJS de alimentos com modo TACO local"
git push -u origin feat/nestjs-alimentos
```

O `npm install` gera `backend/package-lock.json`, que deve entrar no commit. Abra um Pull Request para a `main` depois da revisão; **não faça push direto na main**.

## 5. Observações técnicas

- Os alimentos são pesquisados sem diferenciar acentos/maiúsculas. No PostgreSQL a consulta usa parâmetros, não concatena texto da pesquisa em SQL.
- Os nutrientes são valores por **100 g** na tabela TACO e são multiplicados por `grams / 100`. Campos ausentes (`NA`, `Tr`, vazio) são tratados como `null`, não como zero medido.
- Para produção, ajuste `VITE_API_URL` para a URL pública do backend, `CORS_ORIGIN` para a origem do frontend e mantenha `ALIMENTOS_SOURCE=postgres`.
- O login atual (`src/services/auth.js`) ainda usa `localStorage` do protótipo. **Não é autenticação segura de produção**. Na etapa seguinte, implementar backend de usuários/sessões, validação e guards.
- **O projeto foi preparado sem credenciais do banco.** É necessário fazer os testes de integração de verdade em um ambiente com Node, dependências npm e, posteriormente, banco real. Este pacote não confirma o funcionamento com o Supabase remoto.
