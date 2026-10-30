# Que Fome! — ativar Supabase + RapidAPI (NestJS)

Este pacote é uma continuação da migração: mantém o React e as rotas que já funcionavam e acrescenta consultas à RapidAPI via backend, para não expor a chave privada no navegador. **As credenciais reais não foram fornecidas, portanto não há confirmação de acesso remoto.**

## 1. Trabalhe em uma branch (nunca na main)

No repositório clonado que contém a pasta `.git`:

```powershell
git status
git branch --show-current
# Se estiver na main, crie sua branch:
git switch -c feat/supabase-rapidapi
```

Se tiver alterações locais, faça um backup/commit antes de copiar os arquivos deste ZIP, e nunca substitua a pasta `.git`.

## 2. Pegue a conexão do Supabase

1. Abra o projeto no dashboard do Supabase.
2. Clique em **Connect** (topo do projeto).
3. Para um NestJS executado localmente, selecione **Session pooler** (porta 5432) se a rede for IPv4; **Direct connection** só se sua rede for compatível com IPv6.
4. Copie a string `postgresql://...` e substitua `[YOUR-PASSWORD]` pela senha do banco de dados do projeto. Se a senha tiver `@`, `#`, `?`, `&`, espaço ou outros caracteres reservados, codifique esses caracteres com URL encoding.
5. No `backend`, copie `.env.example` para `.env` e configure a string real como `DATABASE_URL`.

Exemplo (placeholders, NÃO use como valores reais):

```env
ALIMENTOS_SOURCE=postgres
DATABASE_URL=postgresql://postgres.PROJECT_REF:SENHA@POOLER_HOST:5432/postgres?sslmode=require
RAPIDAPI_KEY=SUA_CHAVE_PRIVADA
RAPIDAPI_HOST=taco-api-br1.p.rapidapi.com
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**NUNCA** coloque `DATABASE_URL` ou `RAPIDAPI_KEY` em um arquivo com prefixo `VITE_`, no código React, em prints públicos ou no GitHub. `.gitignore` já ignora arquivos `.env`. Recomendação: mantenha `backend/.env` fora de qualquer commit e compartilhe só variáveis fictícias.

## 3. Verifique se a tabela existe no Supabase

Abra **SQL Editor → New query** e execute APENAS esta leitura:

```sql
SELECT to_regclass('public.alimentos') AS tabela;
```

- Se retornar `public.alimentos`, a tabela existe; **não rode novamente** a migration.
- Se retornar `null`, e se este for mesmo o projeto/banco destinado ao Que Fome!, execute **uma vez** o conteúdo do arquivo `supabase/migrations/20261006000000_create_alimentos_table.sql` no SQL Editor, após revisar o esquema. Isso altera o banco.

Agora abra o terminal dentro de `backend`:

```powershell
npm install
npm run test:supabase
```

Se a tabela estiver vazia e você quiser os dados locais TACO no banco:

```powershell
npm run import:taco
npm run test:supabase
```

`import:taco` insere/atualiza 597 alimentos via `ON CONFLICT (taco_id) DO UPDATE`. Portanto, **revise antes** se `public.alimentos` já contém informações próprias que não devem ser substituídas.

## 4. Copie a chave da API RapidAPI

1. Entre na sua conta do RapidAPI e localize a **TACO API BR1** (ou o serviço ao qual você assinou).
2. Confirme que a assinatura/plano para **essa API específica** está ativo; possuir uma chave genérica não basta.
3. Na página **Endpoints / Code Snippets**, confirme os headers `X-RapidAPI-Key` e `X-RapidAPI-Host` e o domínio do endpoint. No JS original do projeto, o host era `taco-api-br1.p.rapidapi.com` e as rotas usadas eram `GET /foods/?q=...&limit=100` e `POST /foods/calculate-meal`.
4. Copie a chave para `RAPIDAPI_KEY` e confirme o host em `RAPIDAPI_HOST` **apenas no arquivo `backend/.env`**.

Caso receba a mensagem `You are not subscribed to this API`, verifique a assinatura da API específica na RapidAPI. Não é um problema do Supabase.

## 5. Inicie o NestJS, depois teste as duas fontes

```powershell
cd backend
npm run dev
```

Em outro terminal:

```powershell
cd backend
npm run test:supabase
npm run test:rapidapi
npm run test:api
```

URLs para teste manual:

| Fonte | Busca | Cálculo |
| --- | --- | --- |
| Supabase/PostgreSQL | `GET http://localhost:3000/alimentos?busca=morango` | `POST http://localhost:3000/alimentos/calcular` |
| RapidAPI | `GET http://localhost:3000/alimentos/rapidapi?busca=morango` | `POST http://localhost:3000/alimentos/rapidapi/calcular` |

Corpo JSON do POST em ambas: `{"items":[{"id":1,"grams":100}]}`. **Use os IDs vindos da mesma fonte na consulta e no cálculo.** Não suponha que os IDs de fontes distintas correspondem ao mesmo alimento.

Os resultados da RapidAPI podem variar conforme o plano, o host, os endpoints e o esquema dos dados de terceiros. Teste também a tabela nutricional antes de disponibilizar os cálculos externos aos usuários.

## 6. Escolha qual fonte o React deve usar

Na **raiz do projeto** (fora de `backend`), crie um `.env` com:

```env
VITE_API_URL=/api
VITE_ALIMENTOS_SOURCE=supabase
```

- `supabase`: React usa a busca e cálculo locais do NestJS associados ao PostgreSQL.
- `rapidapi`: React usa a busca e cálculo da RapidAPI, **por meio do NestJS**, sem revelar a chave.

Para alternar, mude só `VITE_ALIMENTOS_SOURCE` e reinicie `npm run dev` do Vite. **As duas integrações permanecem configuradas no backend e acessíveis em rotas diferentes**, porém cada consulta/cálculo do frontend usa uma única fonte de cada vez para preservar a consistência dos IDs.

O Vite já redireciona `/api` para `http://localhost:3000`, portanto o React não precisa conhecer o domínio da RapidAPI nem a conexão PostgreSQL.

## 7. Git e revisão

```powershell
# Raiz do repositório, na sua branch
npm run build
cd backend
npm run typecheck
npm run build
cd ..
git status
# Confira que nem .env nem segredos apareceram
# Depois de revisar:
git add .
git commit -m "feat: integra Supabase e RapidAPI no NestJS"
git push -u origin feat/supabase-rapidapi
```

Se já estiver numa branch diferente, troque o último nome pela sua branch real. Faça PR para a main após os testes e revisão.

### Limites / segurança

- A RapidAPI é uma API externa. Em produção, acrescente autenticação ou rate limit e cache no NestJS para impedir uso indevido da sua quota.
- O acesso direto ao PostgreSQL através do backend é distinto da chave pública/`anon` do Supabase; **para esta implementação com `pg`, use a URI PostgreSQL e senha do banco**, não a chave `anon` nem `service_role`.
- `test:rapidapi` verifica somente a busca. O cálculo da API externa exige teste de payload e comparação do significado/unidade de micronutrientes, pois não foi possível consultar o provedor com uma chave real aqui.
- A conexão e importação remotas só podem ser validadas na sua máquina, com credenciais suas.
