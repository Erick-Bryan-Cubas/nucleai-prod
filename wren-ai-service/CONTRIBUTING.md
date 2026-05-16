# Bem-vindo ao guia de contribuicao do Wren AI Service

Obrigado por dedicar seu tempo para contribuir com o projeto! Este documento fornece diretrizes para contribuicao no servico de IA do Wren.

## Guia para novos contribuidores

- Para ter uma visao geral do projeto, leia [concepts](https://docs.getwren.ai/oss/concept/wren_ai_service).
- Para configurar o projeto para desenvolvimento local, leia [Environment Setup](README.md#environment-setup) e [Start the service for development](README.md#start-the-service-for-development).
- Para entender o codigo mais rapidamente, preparamos [uma introducao ao codebase](docs/code_design.md).

## Primeiros passos

### Issues

#### Criar uma nova issue

Se voce identificar um problema, primeiro busque para ver se ja existe uma issue relacionada. Se nao existir, abra uma nova [issue](https://github.com/Canner/WrenAI/issues/new/choose).

#### Resolver uma issue

Veja as [issues abertas](https://github.com/Canner/WrenAI/issues?q=is%3Aopen+is%3Aissue+label%3Amodule%2Fai-service) para encontrar algo do seu interesse. Em geral, nao atribuimos issues a pessoas especificas. Se voce escolher uma issue para trabalhar, fique a vontade para abrir um PR com a correcao.

### Pull Request

Quando terminar as alteracoes, crie um pull request (PR).
- Preencha a descricao para facilitar a revisao.
- Nao esqueca de [vincular PR a issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) quando aplicavel.
- Adicione o label `module/ai-service` no PR.
- Habilite a opcao [allow maintainer edits](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork) para permitir atualizacao do branch visando merge.
  Depois de enviar o PR, alguem do time Canner revisara sua proposta. Podemos fazer perguntas ou solicitar informacoes adicionais.
- Podemos solicitar mudancas antes do merge, via [suggested changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/incorporating-feedback-in-your-pull-request) ou comentarios no PR. Voce pode aplicar mudancas sugeridas diretamente pela UI. Outras mudancas podem ser feitas no seu fork e commitadas no branch.
- Ao atualizar o PR e aplicar mudancas, marque cada conversa como [resolved](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/commenting-on-a-pull-request#resolving-conversations).
- Adicione um dos prefixos ao titulo do PR para que a CI capture automaticamente o changelog:
  - `feat(wren-ai-service)`: novas funcionalidades
  - `chore(wren-ai-service)`: manutencao
  - `fix(wren-ai-service)`: correcoes de bug
- Se tiver problemas de merge, consulte este [tutorial de git](https://github.com/skills/resolve-merge-conflicts) para resolver conflitos e outros problemas.

### Seu PR foi mergeado!

Parabens :tada::tada: O time Canner agradece :sparkles:.

Depois do merge, sua contribuicao entra no proximo release.

Agora voce faz parte da comunidade Canner.

## Como adicionar seu LLM, Embedder ou Document Store preferido

- Leia [esta documentacao para mais detalhes](https://docs.getwren.ai/oss/ai_service/guide/custom_llm#adding-a-custom-llm-embedder-or-document-store-to-wren-ai).
