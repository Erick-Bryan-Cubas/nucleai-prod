Este e um projeto [Next.js](https://nextjs.org/) criado com [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Iniciar wren-ui a partir do codigo-fonte

Passo 1. Garanta que sua versao do Node seja 18
```bash
node -v
```

Passo 2. Instale as dependencias:

```bash
yarn 
```

Passo 3 (Opcional). Trocar banco de dados

O wren-ui usa SQLite como banco padrao. Para usar Postgres no wren-ui, defina as duas variaveis abaixo.

```bash
# windows
SET DB_TYPE=pg
SET PG_URL=postgres://user:password@localhost:5432/dbname 

# linux or mac
export DB_TYPE=pg
export PG_URL=postgres://user:password@localhost:5432/dbname
```
- `PG_URL` e a string de conexao do seu banco Postgres.

Para voltar ao SQLite, redefina `DB_TYPE` para `sqlite`.
```
# windows
SET DB_TYPE=sqlite
SET SQLITE_FILE={your_sqlite_file_path} # default is ./db.sqlite3

# linux or mac
export DB_TYPE=sqlite
export SQLITE_FILE={your_sqlite_file_path}
```

Passo 4. Rode as migracoes:

```bash
yarn migrate
# or
npm run migrate
```


Passo 5. Rode o servidor de desenvolvimento:

```bash
# Execute isto se voce iniciar wren-engine e ibis-server via docker
# Linux or MacOS
export OTHER_SERVICE_USING_DOCKER=true
export EXPERIMENTAL_ENGINE_RUST_VERSION=false # set to true if you want to use the experimental Rust version of the Wren Engine
# Windows
SET OTHER_SERVICE_USING_DOCKER=true
SET EXPERIMENTAL_ENGINE_RUST_VERSION=false # set to true if you want to use the experimental Rust version of the Wren Engine

# Rode o servidor de desenvolvimento
yarn dev
# or
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador para ver o resultado.


## Desenvolvimento local do modulo wren-ui
Existem varios modulos no Wren AI. Para desenvolver o wren-ui, voce pode iniciar outros modulos (servicos) via docker-compose.
Na secao [Iniciar wren-ui a partir do codigo-fonte](#iniciar-wren-ui-a-partir-do-codigo-fonte), voce viu como iniciar o wren-ui a partir do codigo.
Para iniciar outros modulos via docker-compose, siga os passos abaixo.

Passo 1. Prepare seu arquivo .env
Na pasta WrenAI/docker, voce encontra `.env.example`. Copie esse arquivo para `.env.local`.

```bash
# assumindo que o diretorio atual e wren-ui
cd ../docker
cp .env.example .env.local
```
Passo 2. Modifique seu `.env.local`
Preencha `OPENAI_API_KEY` com sua chave da API da OpenAI antes de iniciar.

Voce tambem pode alterar `WREN_ENGINE_VERSION`, `WREN_AI_SERVICE_VERSION` e `IBIS_SERVER_VERSION` para as versoes desejadas.


Passo 3. Inicie os servicos via docker-compose
```bash
# diretorio atual: WrenAI/docker
docker-compose -f docker-compose-dev.yaml --env-file .env.example up

# voce pode adicionar -d para rodar os servicos em background
docker-compose -f docker-compose-dev.yaml --env-file .env.example up -d
# depois pare os servicos com
docker-compose -f docker-compose-dev.yaml --env-file .env.example down
```

Passo 4. Inicie o wren-ui a partir do codigo-fonte
Consulte [Iniciar wren-ui a partir do codigo-fonte](#iniciar-wren-ui-a-partir-do-codigo-fonte).

Passo 5. (Opcional) Desenvolva outros modulos junto com o wren-ui

Como mencionado acima, voce pode usar docker-compose para iniciar outros modulos. O mesmo vale ao desenvolver esses modulos.
Do ponto de vista do wren-ui, se voce quiser desenvolver outros modulos ao mesmo tempo, pode parar o container e iniciar o modulo pelo codigo-fonte.

Exemplo: se voce quiser desenvolver o modulo ai-service, pare o container do ai-service e inicie o ai-service pelo codigo-fonte.
```yaml
# docker/docker-compose-dev.yaml
wren-engine:
    image: ghcr.io/canner/wren-engine:${WREN_ENGINE_VERSION}
    pull_policy: always
    platform: ${PLATFORM}
    expose:
      - ${WREN_ENGINE_SQL_PORT}
    ports:
      - ${WREN_ENGINE_PORT}:${WREN_ENGINE_PORT}
    volumes:
      - data:/usr/src/app/etc
    networks:
      - wren
    depends_on:
      - bootstrap
    ...
# comente o servico ai-service
wren-ai-service:
    image: ghcr.io/canner/wren-ai-service:${WREN_AI_SERVICE_VERSION}
    pull_policy: always
    platform: ${PLATFORM}
    ports:
      - ${AI_SERVICE_FORWARD_PORT}:${WREN_AI_SERVICE_PORT}
    environment:
      WREN_UI_ENDPOINT: http://host.docker.internal:${WREN_UI_PORT}
      # as vezes o console nao mostra mensagens de print,
      # usar PYTHONUNBUFFERED: 1 pode resolver
      PYTHONUNBUFFERED: 1
      CONFIG_PATH: /app/data/config.yaml
    env_file:
      - ${PROJECT_DIR}/.env
    volumes:
      - ${PROJECT_DIR}/config.yaml:/app/data/config.yaml
    networks:
      - wren
    depends_on:
      - qdrant

ibis-server:
    image: ghcr.io/canner/wren-engine-ibis:${IBIS_SERVER_VERSION}
    ...
```
Depois, consulte README.md ou CONTRIBUTION.md do modulo para iniciar o modulo a partir do codigo-fonte.

Exemplo: consulte o [ai-service README](https://github.com/Canner/WrenAI/blob/main/wren-ai-service/README.md#start-the-service-for-development) para iniciar o ai-service pelo codigo-fonte.



## FAQ
### Posso ter multiplos projetos ao mesmo tempo no Wren AI?
Atualmente nao suportamos multiplos projetos simultaneos no Wren AI. Voce pode ter apenas um por vez.
Mas existe um workaround. Como o Wren Engine e stateless e o modelo semantico e armazenado no banco (Sqlite ou Postgres),
voce pode alternar entre projetos trocando o banco e garantindo o deploy apos iniciar o servidor.

> Dica: defina `DB_TYPE` e `SQLITE_FILE` ou `PG_URL` para especificar qual banco usar.

Exemplo:
```bash
# inicie seu primeiro projeto usando banco padrao (sqlite)
yarn migrate
yarn dev

# ... depois do onboarding e muito trabalho, voce quer trocar para outro projeto
# pare o servidor

# defina outro arquivo sqlite
export SQLITE_FILE=./new_project.sqlite
yarn migrate
yarn dev

# No navegador, ... depois de outro onboarding e trabalho
# voce pode voltar para o primeiro projeto definindo o primeiro arquivo sqlite
export SQLITE_FILE=./first_project.sqlite

yarn dev  # nao precisa rodar migracao novamente

# na pagina de modeling, clique em deploy para publicar no wren-ai-service.
# seu Wren AI estara pronto para responder sua pergunta.
```

## Learn More

Para aprender mais sobre Next.js, veja os recursos abaixo:

- [Next.js Documentation](https://nextjs.org/docs) - conheca recursos e API do Next.js.
- [Learn Next.js](https://nextjs.org/learn) - tutorial interativo de Next.js.

Voce tambem pode visitar [o repositorio do Next.js no GitHub](https://github.com/vercel/next.js/) - feedbacks e contribuicoes sao bem-vindos!