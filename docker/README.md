## Servicos

- `wren-engine`: servico do engine. Veja um exemplo aqui: [wren-engine
  /example](https://github.com/Canner/wren-engine/tree/main/example)
- `wren-ai-service`: servico de IA.
- `qdrant`: vector store usado pelo servico de IA.
- `wren-ui`: servico de interface.
- `bootstrap`: coloca os arquivos necessarios no volume do servico de engine.

## Volume

Os dados sao compartilhados usando o volume `data`.

A estrutura de caminhos e a seguinte:

- `/mdl`
  - `*.json` (o `sample.json` sera criado durante o bootstrap)
- `accounts`
- `config.properties`

## Rede

- Consulte [Network drivers overview](https://docs.docker.com/engine/network/drivers/) para saber mais sobre o driver de rede `bridge`.

## Como iniciar (primeira vez em uma maquina nova)

```bash
# 1. Copie os arquivos de configuracao
cp .env.example .env
cp .env.runtime.example .env.runtime
cp config.example.yaml config.yaml

# 2. Edite .env: preencha OPENAI_API_KEY e USER_UUID (uuid v4 qualquer)
# 3. Edite config.yaml se quiser usar Ollama ou outro LLM (veja secao abaixo)

# 4. Suba os containers (o wren-ui sera compilado localmente na primeira vez)
docker compose up -d

# 5. Para encerrar
docker compose down
```

> **Nota:** O `wren-ui` e compilado a partir do codigo local (`../wren-ui`).
> O primeiro build leva ~10-15 minutos. Builds subsequentes usam cache e sao muito mais rapidos.

### Opcional

- Se a porta 3000 estiver em uso, altere `HOST_PORT` no `.env`.
- Para resetar todos os dados (banco SQLite + indices Qdrant): `docker compose down -v`.

## Etapa de atualizacao (preserva a logo Nuclea)

Se voce quiser atualizar pacotes/imagens e todos os engines do WrenAI sem alterar `wren-ui/public` (onde fica a logo da Nuclea), execute:

`pwsh -File .\update-wrenai.ps1`

Se voce quiser apenas comparar as versoes configuradas atualmente com os registries dos containers (sem atualizar), execute:

`pwsh -File .\update-wrenai.ps1 -OnlyCheck`

Se voce quiser que o script troque tags de engine desatualizadas no `.env` para `latest` antes de atualizar os containers, execute:

`pwsh -File .\update-wrenai.ps1 -UseLatestTags`

O que esta etapa faz:

0. Verifica as versoes atuais vs imagens do repositorio (`latest`) e indica necessidade de atualizacao.
0.1. Opcional (`-UseLatestTags`): atualiza variaveis de versao desatualizadas no `.env` para `latest` e cria `.env.bak`.
1. Faz backup de `wren-ui/public`.
2. Baixa as imagens mais recentes de `bootstrap`, `wren-engine`, `ibis-server`, `wren-ai-service` e `qdrant`.
3. Reconstrui o `wren-ui` com `--pull`.
4. Executa `docker compose up -d`.
5. Restaura `wren-ui/public` a partir do backup.
6. Remove imagens Docker nao utilizadas por nenhum container (`docker image prune -a -f`).

## Como iniciar com LLM customizado

Para iniciar com um LLM customizado, o processo e semelhante ao fluxo com OpenAI. A principal diferenca e que voce precisa editar o arquivo `config.yaml`
que foi criado no passo anterior. Depois de modificar o arquivo, voce pode reiniciar os servicos executando `docker-compose --env-file .env up -d --force-recreate wren-ai-service`.

Para detalhes sobre como ajustar a configuracao para diferentes provedores e modelos de LLM, consulte [Configuracao do AI Service](../wren-ai-service/docs/configuration.md).
Esse guia traz instrucoes abrangentes para configurar provedores de LLM, embedders e outros componentes do servico de IA.

## Configurar LLM e embeddings pela UI (sem restart / sem rebuild)

A partir da refatoracao NucleAI, a chave OpenAI e os providers de **chat** e **embedding** (OpenAI ou Ollama) podem ser configurados diretamente pela interface em **Settings -> LLM e embeddings** — sem editar arquivos e sem reiniciar containers.

### Pre-requisitos

1. Copie `.env.runtime.example` para `.env.runtime` antes do primeiro `docker compose up`. O arquivo pode ficar vazio.
2. Garanta que `ai-service-patches/` esta presente no diretorio `docker/` (vem versionado no repo).

### Como funciona

- O usuario abre Settings -> LLM e embeddings, escolhe separadamente os providers de chat e embedding, informa a chave/endpoint e clica Save.
- O wren-ui:
  1. Armazena a chave criptografada (AES-256-CBC) em `llm_config` no SQLite.
  2. Regenera `docker/config.yaml` e `docker/.env.runtime` no volume compartilhado.
  3. Chama `POST /v1/config/reload` no wren-ai-service.
- O wren-ai-service re-instancia o `service_container` in-place; a proxima request ja usa a nova config.
- Configuracao mista e suportada: por exemplo, **OpenAI para chat + Ollama para embeddings** ou o inverso.
- **Apenas mudancas de embedding** (provider, modelo, dimensao ou endpoint relevante) exigem **Force re-index** no botao de Deploy para reconstruir as colecoes Qdrant. Trocas somente de chat nao exigem reindexacao.

### Arquitetura do patch

- `ai-service-patches/sitecustomize.py` e auto-importado pelo Python no startup do wren-ai-service e anexa o router `/v1/config/reload` ao app FastAPI ANTES do uvicorn servir.
- `ai-service-patches/config_reload.py` contem a implementacao do endpoint: le config.yaml, reconstroi Settings + service_container, faz hot-swap atomico em `app.state`.
- `ai-service-patches/entrypoint-wrapper.sh` so ajusta `PYTHONPATH` para o sitecustomize ser encontrado.

### Limitacoes conhecidas

- A chave em plain text fica em `.env.runtime` (permissao 600). Esta no `.gitignore`.
- Se o patch falhar ao carregar (alteracao na imagem oficial do wren-ai-service), o endpoint retorna 404 e a UI mostra uma mensagem — nesse caso, editar `config.yaml` manualmente e restart continua funcionando.
