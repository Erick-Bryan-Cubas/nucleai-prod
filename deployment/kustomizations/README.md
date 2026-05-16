# Deploy do Wren AI em Kubernetes com Kustomization
1. Garanta que todas as dependencias necessarias para o deploy do Wren AI estejam instaladas.
2. Ajuste os valores e manifests de acordo com o seu ambiente Kubernetes.
3. Faca o deploy dos Secrets separadamente.
4. Faca o deploy da aplicacao gerada pelo kustomize.

Observacao: sem autenticacao, ao publicar na internet qualquer pessoa pode acessar o app, ver seus dados e modificar suas configuracoes.

## Dependencias usadas nesta kustomization
- nginx.ingress
- external-dns
- cert-manager
- kubectl kustomize
- helm (para minikube)

## Etapas de deploy

Sugestao: antes de fazer o deploy, revise os manifests na pasta `deployment/kustomizations` e adapte ao seu ambiente Kubernetes.

A pasta `deployment/kustomizations` contem o arquivo `kustomization.yaml`, que gera os manifests no arquivo `deployment/kustomizations/wrenai.kustomized.yaml`, usado para deploy no seu cluster Kubernetes.

```shell
# Clone o repositorio com a kustomization
git clone https://github.com/Canner/WrenAI.git
cd WrenAI

# Gere o manifest com kustomization
kubectl kustomize deployment/kustomizations --enable-helm > deployment/kustomizations/wrenai.kustomized.yaml

# Crie o namespace
kubectl create namespace wren

# !!!!!!!!!!!!
# MODIFIQUE PRIMEIRO o manifest secret-wren_example.yaml
# OPENAI_API_KEY e OBRIGATORIA: sem uma chave valida o pod wren-ai-service-deployment nao inicia
# Voce deve atualizar PG_URL, caso contrario o wren-ui nao funcionara
#vi deployment/kustomizations/examples/secret-wren_example.yaml
kubectl apply -f deployment/kustomizations/examples/secret-wren_example.yaml -n wren

# Deploy da aplicacao:
kubectl apply -f deployment/kustomizations/wrenai.kustomized.yaml

kubectl get pods -n wren
```

### Notas sobre a kustomization
- `deployment/kustomizations/kustomization.yaml` e o arquivo principal responsavel por versoes de componentes como Qdrant, PostgreSQL e da propria aplicacao Wren AI. Ele tambem combina recursos dos manifests como ConfigMaps, Deployments e Services, alem de exemplos de Ingress, Certificates e Secrets.
- `deployment/kustomizations/base` e a pasta base com os manifests centrais do Wren AI. Em geral, voce nao precisara altera-los, mas vale revisar.
- `deployment/kustomizations/examples` contem exemplos de manifests para voce adaptar ao seu ambiente k8s e necessidades.
- `deployment/kustomizations/examples/secret-wren_example.yaml` e um arquivo que normalmente nao deve ser incluido no `kustomization.yaml`, pois nao e boa pratica manter senhas em texto claro no repositorio GitOps. Por isso ele fica comentado no `kustomization.yaml` e recomendamos deploy separado.
- `deployment/kustomizations/examples/wrenai-ingress-example.yaml` e um exemplo de deploy de Ingress. Pode ser usado como template do seu Ingress. Ele inclui dependencia de external-dns para adicionar seu DNS automaticamente; sem isso, voce precisa registrar manualmente. Tambem assume uso de nginx.ingress, aumentando timeouts e desabilitando regras globais de owasp/modsecurity que podem impedir a UI de funcionar corretamente. Comente a secao TLS se nao quiser usar `https`. Observacao: sem autenticacao, qualquer pessoa pode acessar o app, ver seus dados e modificar suas configuracoes.
- `deployment/kustomizations/examples/certificate-wren_example.yaml` e um exemplo para certificados do Ingress do Wren-UI. Pode ser usado como template e depende de cert-manager para provisao automatica; sem isso, adicione manualmente.
- `deployment/kustomizations/examples/certificate-qdrant_example.yaml` e um exemplo de certificados para Ingress do Qdrant. E opcional e normalmente nao necessario, pois em geral o banco vetorial nao e exposto publicamente. Por isso ele fica comentado no `kustomization.yaml`. Tambem depende de cert-manager para provisao automatica.
- A pasta `deployment/kustomizations/patches` esta vazia; sinta-se livre para adicionar seus patches e overlays.

#### Banco de dados do Wren-UI
A partir da versao 0.6.0 do wren-ui, por padrao este kustomization usa PostgreSQL para o wren-ui, instalado no mesmo namespace do wren-ai.

- `postgres`: banco de dados instalado no mesmo namespace do wren-ai. Voce *deve* atualizar `PG_URL` no Secret `deployment/kustomizations/examples/secret-wren_example.yaml`.

Exemplo: `PG_URL: "postgres://postgres:postgres@wrenai-postgresql:5432/admin_ui"`
- `postgres://`: protocolo de conexao com banco PostgreSQL.
- `postgres:postgres`: usuario (primeiro) e senha (segundo), separados por `:`.
- `@wren-postgresql`: hostname do servidor de banco. "wren-postgresql" significa que o banco esta rodando no cluster Kubernetes com esse nome no *mesmo* namespace. Se usar outro namespace, informe o hostname completo, por exemplo: `wren-postgresql.wrenai.svc.cluster.local`.
- `:5432`: porta do PostgreSQL (padrao).
- `/admin_ui`: nome do banco de dados. Neste caso, `admin_ui`. Esse valor aparece em `deployment/kustomizations/helm-values_postgresql_15.yaml`, no parametro `auth.database`.

# Minikube
Prepare seu ambiente k8s. Em seguida use a secao `Etapas de deploy` para implantar o Wren AI no seu cluster.

```shell
minikube start
minikube addons enable ingress
minikube addons enable metallb
minikube kubectl -- get nodes
minikube kubectl -- get pods -A

minikube update-context
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install external-dns bitnami/external-dns
helm install \
  external-dns bitnami/external-dns \
  --namespace external-dns \
  --version 7.5.2 \
  --create-namespace \
  --set installCRDs=true
kubectl get pods -n external-dns

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --version v1.13.6 \
  --create-namespace \
  --set installCRDs=true
kubectl get pods -n cert-manager

##########
# Use a secao `Etapas de deploy` para continuar como faria em um cluster k8s de producao.
```

# Patches GitOps
Na pasta [patches](./patches) voce encontra exemplos uteis de kustomization para usar o kustomize oficial deste repositorio como camada base e customizar apenas alguns valores. Isso pode ser util para seu fluxo GitOps, inclusive com FluxCD ou ArgoCD.
