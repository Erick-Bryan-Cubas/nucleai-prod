# Servico de IA do Wren AI

## Conceitos

Leia a [documentacao](https://docs.getwren.ai/oss/concept/wren_ai_service) para entender os conceitos do servico de IA do Wren.

## Setup para desenvolvimento local

### Pre-requisitos

1. **Python**: instale Python 3.12.*

   - Recomendado: use [`pyenv`](https://github.com/pyenv/pyenv?tab=readme-ov-file#installation) para gerenciar versoes de Python

2. **Poetry**: instale Poetry 1.8.3

   ```bash
   curl -sSL https://install.python-poetry.org | python3 - --version 1.8.3
   ```

3. **Just**: instale o command runner [Just](https://github.com/casey/just?tab=readme-ov-file#packages) (versao 1.36 ou superior)

### Setup passo a passo

1. **Instalar dependencias**:

   ```bash
   poetry install
   ```

2. **Gerar arquivos de configuracao**:

   ```bash
   just init
   ```

   Isso cria `.env.dev` e `config.yaml`. Use `just init --non-dev` para gerar apenas `config.yaml`.

   > No Windows, adicione a linha `set shell:= ["bash", "-cu"]` no inicio do Justfile.

4. **Configurar ambiente**:

   - Edite `.env.dev` para definir variaveis de ambiente
   - Modifique `config.yaml` para configurar componentes, pipelines e outras opcoes
   - Consulte [AI Service Configuration](./docs/configuration.md) para instrucoes detalhadas

5. **Preparar ambiente de desenvolvimento** (opcional):

   - Instale hooks de pre-commit:

     ```bash
     poetry run pre-commit install
     ```

   - Execute verificacoes iniciais de pre-commit:

     ```bash
     poetry run pre-commit run --all-files
     ```

6. **Executar testes** (opcional):

   ```bash
   just test
   ```

### Iniciando o servico

1. **Subir containers necessarios**:

   ```bash
   just up
   ```

2. **Iniciar o servico de IA**:

   ```bash
   just start
   ```

3. **Acessar o servico**:

   - Documentacao da API: `http://WREN_AI_SERVICE_HOST:WREN_AI_SERVICE_PORT` (padrao: <http://localhost:5556>)
   - Interface de usuario: `http://WREN_UI_HOST:WREN_UI_PORT` (padrao: <http://localhost:3000>)

4. **Parar o servico**:
   Ao finalizar, pare os containers:

   ```bash
   just down
   ```

Esse setup garante um ambiente de desenvolvimento consistente e ajuda a manter a qualidade do codigo com hooks de pre-commit e testes.

## Outros

### Avaliacao de pipeline

Para um entendimento completo sobre como avaliar pipelines, consulte o [framework de avaliacao](./eval/README.md). O documento traz orientacoes detalhadas sobre o processo de avaliacao, incluindo como preparar e executar avaliacoes, interpretar resultados e usar metricas de forma efetiva.

### Estimar a velocidade do pipeline (pode estar desatualizado)

- Para rodar o load test:
  - Configure `DATASET_NAME` em `.env.dev`
  - Ajuste a configuracao de teste, se necessario:
    - Ajuste a quantidade de usuarios em `tests/locust/config_users.json`
  - Na pasta `wren-ai-service`, execute `just up` para iniciar os containers Docker
  - Na pasta `wren-ai-service`, execute `just start` para iniciar o servico de IA
  - Execute `just load-test`
  - Verifique os relatorios em `/outputs/locust`, com 3 arquivos no formato **locust*report*{test_timestamp}**:
    - `.json`: relatorio de teste em formato json, incluindo dados como provedor e versao de LLM
    - `.html`: relatorio de teste em formato html, com tabelas e graficos
    - `.log`: log do teste

## Contribuicao

Obrigado por investir seu tempo contribuindo com o projeto! Leia [este guia para mais informacoes](CONTRIBUTING.md).
