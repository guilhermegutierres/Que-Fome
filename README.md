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
