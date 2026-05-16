# Introducao ao codebase do wren-ai-service

## Sumario

- [Objetivo](#objetivo)
- [Setup de ambiente e execucao local do wren-ai-service](#setup-de-ambiente-e-execucao-local-do-wren-ai-service)
- [Introducao ao codebase](#introducao-ao-codebase)
    - [Entrypoint](#entrypoint)
    - [Globals](#globals)
    - [API endpoints](#api-endpoints)
    - [Services](#services)
    - [Pipelines](#pipelines)
    - [Providers](#providers)
    - [Outros](#outros)

## Objetivo

Este documento aprofunda os detalhes de implementacao do wren-ai-service. Ele tem dois objetivos:
1. Ajudar voce a entender melhor como o wren-ai-service funciona internamente.
2. Ajudar voce a identificar com mais confianca qual parte do codebase ajustar ao contribuir com o Wren AI.

## Setup de ambiente e execucao local do wren-ai-service

Se voce ainda nao configurou o ambiente ou nao sabe como rodar o wren-ai-service localmente, consulte primeiro este [documento](../README.md#setup-for-local-development).

## Introducao ao codebase

O wren-ai-service e um servico de IA que expoe API REST. Existem quatro conceitos principais: `API endpoints`, `Services`, `Pipelines` e `Providers`.
1. `API endpoints`: sao portas de entrada para usuarios acessarem diferentes tipos de sistemas RAG (retrieval-augmented-generation); tambem podem ser vistos como encapsulamento de Services. Por exemplo, quando um usuario faz uma pergunta para obter SQL, ele chama `/ask`, e o AskService executa o processamento em background.
2. `Services`: abstraem conceitos de logica de negocio. Exemplo: AskService para responder perguntas com SQL, AskDetailsService para quebrar SQL em subetapas e explicar a logica da consulta original. Todo service e composto por uma sequencia de pipelines.
3. `Pipelines`: e onde os sistemas RAG sao de fato implementados. Nem todo pipeline possui indexacao, retrieval e generation completos; isso depende do objetivo do pipeline. Cada pipeline tambem usa providers, como provider de LLM.
4. `Providers`: hoje existem quatro tipos:
     - llm: representa modelos de linguagem; suportamos OpenAI, Azure OpenAI, OpenAI API-compatible e Ollama
     - embedder: representa modelos de embedding; suportamos OpenAI, Azure OpenAI, OpenAI API-compatible e Ollama
     - document store: representa banco vetorial; atualmente usamos Qdrant
     - engine: representa o mecanismo de dados, responsavel por validar sintaxe SQL gerada

### Entrypoint

- O entrypoint do wren-ai-service esta em [`wren-ai-service/src/__main__.py`](../src/__main__.py)
- O ponto principal do entrypoint e o metodo `lifespan`, recurso do FastAPI para definir logica de startup e shutdown.

```python
# https://fastapi.tiangolo.com/advanced/events/#lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup events

    pipe_components = generate_components()
    app.state.service_container = create_service_container(
        pipe_components,
        column_indexing_batch_size=(
            int(os.getenv("COLUMN_INDEXING_BATCH_SIZE"))
            if os.getenv("COLUMN_INDEXING_BATCH_SIZE")
            else 50
        ),
        table_retrieval_size=(
            int(os.getenv("TABLE_RETRIEVAL_SIZE"))
            if os.getenv("TABLE_RETRIEVAL_SIZE")
            else 10
        ),
        table_column_retrieval_size=(
            int(os.getenv("TABLE_COLUMN_RETRIEVAL_SIZE"))
            if os.getenv("TABLE_COLUMN_RETRIEVAL_SIZE")
            else 1000
        ),
        query_cache={
            # the maxsize is a necessary parameter to init cache, but we don't want to expose it to the user
            # so we set it to 1_000_000, which is a large number
            "maxsize": 1_000_000,
            "ttl": int(os.getenv("QUERY_CACHE_TTL") or 120),
        },
    )
    app.state.service_metadata = create_service_metadata(pipe_components)
    init_langfuse()

    yield

    # shutdown events
    langfuse_context.flush()
```

- Na logica de startup, inicializamos componentes de pipeline, service containers (que incluem todos os services), service metadata (metadados registrados em traces no [Langfuse, plataforma open-source de engenharia para LLM](https://langfuse.com/)) e o proprio Langfuse.
- Na inicializacao dos componentes, estamos evoluindo suporte a multiplos LLMs, ou seja, o usuario pode escolher qual LLM sera usado em cada pipeline.
    - Voce ainda precisa ter `.env.dev` localmente, preparar `config.yaml` e executar `just start`.
- Na logica de shutdown, garantimos que todos os eventos do Langfuse sejam transmitidos com sucesso.

### Globals

- O arquivo esta em [`wren-ai-service/src/globals.py`](../src/globals.py)
- Nele voce entende detalhes de service containers e service metadata.
    - service containers (outros services ainda nao sao suportados na UI)
        - SemanticsPreparationService: responsavel por indexar [MDL](https://docs.getwren.ai/oss/engine/concept/what_is_mdl) no Qdrant
        - AskService: responsavel por responder perguntas dos usuarios com SQL (text-to-sql)
        - AskDetailsService: responsavel por quebrar SQL em varias subetapas
    - service metadata
        - Registramos metadados de LLM e embedding model, versao do wren-ai-service etc.

### API endpoints

- Todos os API endpoints de negocio ficam em [`wren-ai-service/src/web/v1/routers`](../src/web/v1/routers)
- Como o processamento de cada endpoint (ex.: ask) pode levar alguns segundos, usamos `background_tasks` do FastAPI. Exemplo: apos chamar a API `ask`, a resposta inicial retorna imediatamente; depois o usuario precisa fazer polling para verificar status da tarefa; quando o status vira `finished`, o resultado final e retornado.
- Cada tipo de endpoint corresponde a um tipo de tarefa de negocio, por exemplo AskService e AskDetailsService.

### Services

- Todos os services ficam em [`wren-ai-service/src/web/v1/services`](../src/web/v1/services)

### Pipelines

- Todos os pipelines ficam em [`wren-ai-service/src/pipelines`](../src/pipelines)
- Como os pipelines sao sistemas RAG, classificamos o papel de cada pipeline como indexing, retrieval ou generation
- A classe abstrata esta em [`wren-ai-service/src/core/pipeline.py`](../src/core/pipeline.py)

### Providers

- Todos os providers ficam em [`wren-ai-service/src/providers`](../src/providers)
- As classes abstratas de providers (LLM, embedding model e document store) estao em [`wren-ai-service/src/core/provider.py`](../src/core/provider.py)
- A classe abstrata de engine esta em [`wren-ai-service/src/core/engine.py`](../src/core/engine.py)
