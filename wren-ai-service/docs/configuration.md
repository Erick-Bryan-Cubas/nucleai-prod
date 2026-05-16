# Configuracao do AI Service

A configuracao do AI service e gerenciada por uma combinacao de variaveis de ambiente e arquivo de configuracao, oferecendo uma abordagem flexivel e segura para setup do servico.

1. **Variaveis de ambiente**:

   - Usadas para informacoes sensiveis, como chaves de API de provedores
   - Definem qual arquivo de configuracao sera usado
   - Permitem configurar parte das opcoes diretamente; veja [Mecanismo de carregamento de settings](#mecanismo-de-carregamento-de-settings)
   - Permitem sobrescrever configuracoes em ambientes diferentes

2. **Arquivo de configuracao**:
   - Usado para configuracao detalhada de componentes, pipelines e outras opcoes do servico
   - Permite configuracoes mais complexas e estruturadas

Essa abordagem dupla garante seguranca para dados sensiveis (via variaveis de ambiente) e, ao mesmo tempo, permite configuracao detalhada e compartilhavel via arquivo. Tambem traz flexibilidade de deploy em diferentes ambientes.

## Mecanismo de carregamento de settings

O AI service usa um carregamento hierarquico de settings para garantir flexibilidade em diferentes ambientes e cenarios de deploy. A precedencia e:

1. **Valores padrao**: definidos como atributos da classe `Settings` em [`config.py`](../src/config.py). Sao a base da configuracao.

2. **Variaveis de ambiente**: usando [pydantic-settings](https://fastapi.tiangolo.com/advanced/settings/#pydantic-settings), o servico procura variaveis com nomes correspondentes aos settings. Quando encontradas, sobrescrevem os valores padrao. Exemplo: `WREN_AI_SERVICE_HOST` pode sobrescrever o valor padrao de `host`.

3. **Arquivo .env.dev**: o servico carrega settings adicionais ou sobrescritas a partir de `.env.dev`, quando presente. Isso e especialmente util em ambiente de desenvolvimento.

4. **Arquivo config.yaml**: possui a maior prioridade. Pode sobrescrever todos os settings anteriores e e usado para configurar componentes, pipelines e opcoes detalhadas. Veja [Arquivo de configuracao](#arquivo-de-configuracao).

Esse mecanismo facilita o gerenciamento de configuracao em todo o ciclo, de desenvolvimento a producao, mantendo seguranca para informacoes sensiveis como chaves de API.

## Arquivo de configuracao

O arquivo de configuracao (`config.yaml`) e organizado em secoes que definem aspectos diferentes do AI service. A seguir, o resumo dos principais componentes:

1. **Configuracao de LLM**:

   ```yaml
   type: llm
   provider: <provider_name>
   models:
     - model: <model_name>
       kwargs: {}
   api_base: <api_endpoint>
   ```

   Esse componente inicializa o provider de LLM em runtime. Voce pode definir multiplos modelos com parametros diferentes. O campo `kwargs` permite configuracoes especificas por modelo. Exemplo:

   ```yaml
   type: llm
   provider: openai_llm
   models:
     - model: gpt-4
       kwargs:
         temperature: 0
         n: 1
         max_tokens: 4096
         response_format:
           type: "json_object"
     - model: gpt-4o-mini
       kwargs: {}
   api_base: https://api.openai.com/v1
   ```

   Para opcoes detalhadas de parametros, consulte a implementacao do provider de LLM especifico.

2. **Configuracao de Embedder**:

   ```yaml
   type: embedder
   provider: <provider_name>
   models:
     - model: <model_name>
       dimension: <embedding_size>
   api_base: <api_endpoint>
   timeout: <timeout_in_seconds>
   ```

   Esse componente configura o embedder, que converte texto em vetores numericos. O `provider` define o servico de embedder (ex.: OpenAI, Ollama). Voce pode definir multiplos `models` com seus parametros. O parametro `dimension` indica o tamanho do vetor de embedding.

3. **Configuracao de Engine**:

   ```yaml
   type: engine
   provider: <provider_name>
   endpoint: <engine_endpoint>
   ```

   Esse componente configura o engine responsavel por gerar consultas SQL. O `provider` define o servico de engine (ex.: Wren UI).

4. **Configuracao de Document Store**:

   ```yaml
   type: document_store
   provider: <provider_name>
   ```

   Esse componente configura o document store, responsavel por armazenar e recuperar embeddings. O `provider` define o servico de document store (ex.: Qdrant).

5. **Configuracao de Pipeline**:

   ```yaml
   type: pipeline
   pipes:
     - name: <pipe_name>
       llm: <provider>.<model_name>
       embedder: <provider>.<model_name>
       engine: <provider_name>
       document_store: <provider_name>
   ```

   Esse componente configura cada pipeline, definindo combinacoes de LLM, embedder, engine e document store. Para LLM e embedder, use `<provider>.<model_name>`. Para engine e document store, use `<provider_name>`.

   Example:

   ```yaml
   type: pipeline
   pipes:
     - name: sql_generation
       llm: openai_llm.gpt-4o-mini
       engine: wren_ui
   ```

6. **Settings**:

   ```yaml
   settings:
     host: <host_address>
     port: <port_number>
     column_indexing_batch_size: <batch_size>
     table_retrieval_size: <retrieval_size>
     table_column_retrieval_size: <column_retrieval_size>
     query_cache_maxsize: <cache_size>
     query_cache_ttl: <cache_ttl_in_seconds>
     langfuse_host: <langfuse_endpoint>
     langfuse_enable: <true/false>
     logging_level: <log_level>
     development: <true/false>
   ```

   Esta secao define varios settings do servico, incluindo host, porta, parametros de indexacao/retrieval, cache, configuracao do Langfuse, nivel de log e modo de desenvolvimento.

Esse arquivo permite customizacao detalhada dos componentes do AI service, dos pipelines e do comportamento geral. Ele centraliza configuracoes complexas mantendo informacoes sensiveis separadas (via variaveis de ambiente). Veja [Full Configuration File](../tools/config/config.full.yaml) para um exemplo completo.
