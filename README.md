# Que Fome!

Aplicação web de receitas culinárias com consulta de alimentos TACO, cálculo nutricional, autenticação, favoritos e publicação de receitas com imagens.

## Tecnologias

- Frontend: React, TypeScript e Vite.
- Backend: NestJS, TypeScript e TypeORM.
- Banco de dados: PostgreSQL 18.
- Containers: Docker Compose para frontend, backend e PostgreSQL. A execução dos containers ainda depende de validação em ambiente compatível.

## Estrutura

- `src/`: interface web.
- `public/`: arquivos estáticos e imagens.
- `backend/src/`: API, autenticação, entidades e acesso ao banco.
- `backend/data/`: dados e catálogos de referência.
- `backend/test/`: testes automatizados.
- `docker/`: arquivos de empacotamento e inicialização dos containers.
- `compose.yaml`: configuração dos serviços Docker.

## Configuração local

Configure `DATABASE_URL` em `backend/.env`. Para verificar a conexão e o catálogo de alimentos, execute `npm --prefix backend run test:postgres`.

## Painel administrativo

O painel usa o PostgreSQL configurado em `backend/.env` e é servido pelo backend
em um endereço separado. Para ativá-lo localmente, execute na raiz:

```powershell
node backend/admin/hash-password.mjs
```

Guarde a senha exibida e adicione estas variáveis ao arquivo local
`backend/.env`. Use a linha de hash gerada pelo comando.

```dotenv
ADMIN_ORIGIN=http://localhost:3001
ADMIN_PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash gerado>
```

Com as dependências do backend instaladas, execute `npm --prefix backend run dev`
e abra http://localhost:3001. As sessões administrativas expiram em oito horas
ou quando o backend reinicia. Para publicar o painel, use um domínio separado
com HTTPS, encaminhe o tráfego para o listener local pela sua infraestrutura e
configure `ADMIN_ORIGIN` com a origem HTTPS exata. Mantenha o arquivo de ambiente
fora do Git.

O painel cadastra receitas oficiais e permite editar e excluir receitas
oficiais e de usuários. Alterações são gravadas no mesmo banco do site.

## Banco de desenvolvimento

O arquivo `docker/postgres/que-fome-dev.dump` contém o schema, receitas oficiais
e o catálogo de alimentos. Na primeira inicialização de um volume vazio, o Docker
restaura esse arquivo. Um backup privado em `docker/local-data/que-fome.dump`, se
presente, tem prioridade. Os backups privados, uploads e arquivos de senha
continuam fora do Git. Cadastre uma conta de teste após iniciar o projeto.
