# 🏗️ Arquitetura NucleAI - AWS ECS Fargate

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Diagrama de Arquitetura](#diagrama-de-arquitetura)
3. [Componentes da Solução](#componentes-da-solução)
4. [Fluxo de Dados](#fluxo-de-dados)
5. [Infraestrutura AWS](#infraestrutura-aws)
6. [Segurança](#segurança)
7. [Estimativa de Custos](#estimativa-de-custos)
8. [Implementação](#implementação)

---

## Visão Geral

O **NucleAI** é uma plataforma de Text-to-SQL com IA que permite análise de dados através de linguagem natural. Esta arquitetura foi projetada para AWS ECS Fargate, oferecendo:

- ✅ **Serverless**: Sem gerenciamento de servidores
- ✅ **Escalabilidade Automática**: Auto-scaling baseado em métricas
- ✅ **Alta Disponibilidade**: Multi-AZ com failover automático
- ✅ **Segurança**: VPC isolada, secrets gerenciados, TLS end-to-end
- ✅ **Observabilidade**: Logs centralizados, métricas e tracing

### Microserviços do Sistema

| Serviço | Descrição | Porta |
|---------|-----------|-------|
| `wren-ui` | Interface Web (Next.js) | 3000 |
| `wren-ai-service` | Serviço de IA/LLM (Python) | 5555 |
| `wren-engine` | Motor de Processamento SQL | 8080 |
| `ibis-server` | Servidor Ibis para conectores | 8000 |
| `qdrant` | Vector Database | 6333/6334 |
| `bootstrap` | Inicialização e Migração | - |

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              AWS CLOUD                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                           REGION: sa-east-1 (São Paulo)                                  │   │
│  │                                                                                                          │   │
│  │   ┌─────────────────┐                                                                                    │   │
│  │   │   Route 53      │◄──── DNS: nucleai.example.com                                                      │   │
│  │   │   (DNS)         │                                                                                    │   │
│  │   └────────┬────────┘                                                                                    │   │
│  │            │                                                                                             │   │
│  │            ▼                                                                                             │   │
│  │   ┌─────────────────┐         ┌─────────────────────────────────────────────────────────────────────┐    │   │
│  │   │   CloudFront    │         │                        VPC: 10.0.0.0/16                             │    │   │
│  │   │   (CDN + WAF)   │────────►│                                                                     │    │   │
│  │   └─────────────────┘         │  ┌────────────────────────────────────────────────────────────┐     │    │   │
│  │                               │  │                    PUBLIC SUBNETS                          │     │    │   │
│  │                               │  │                                                            │     │    │   │
│  │                               │  │   ┌────────────────┐        ┌────────────────┐             │     │    │   │
│  │                               │  │   │  AZ-a          │        │  AZ-b          │             │     │    │   │
│  │                               │  │   │  10.0.1.0/24   │        │  10.0.2.0/24   │             │     │    │   │
│  │                               │  │   │                │        │                │             │     │    │   │
│  │                               │  │   │ ┌────────────┐ │        │ ┌────────────┐ │             │     │    │   │
│  │                               │  │   │ │ NAT        │ │        │ │ NAT        │ │             │     │    │   │
│  │                               │  │   │ │ Gateway    │ │        │ │ Gateway    │ │             │     │    │   │
│  │                               │  │   │ └────────────┘ │        │ └────────────┘ │             │     │    │   │
│  │                               │  │   └────────────────┘        └────────────────┘             │     │    │   │
│  │                               │  │                                                            │     │    │   │
│  │                               │  │                    ┌────────────────┐                      │     │    │   │
│  │                               │  │                    │    ALB         │                      │     │    │   │
│  │                               │  │                    │  (Application  │                      │     │    │   │
│  │                               │  │                    │ Load Balancer) │                      │     │    │   │
│  │                               │  │                    │  Port: 443     │                      │     │    │   │
│  │                               │  │                    └───────┬────────┘                      │     │    │   │
│  │                               │  └────────────────────────────┼───────────────────────────────┘     │    │   │
│  │                               │                               │                                     │    │   │
│  │                               │  ┌────────────────────────────┼───────────────────────────────┐     │    │   │
│  │                               │  │                    PRIVATE SUBNETS                         │     │    │   │
│  │                               │  │                            │                               │     │    │   │
│  │                               │  │   ┌────────────────────────┴────────────────────────┐      │     │    │   │
│  │                               │  │   │            ECS FARGATE CLUSTER                  │      │     │    │   │
│  │                               │  │   │                                                 │      │     │    │   │
│  │                               │  │   │  ┌─────────────────────────────────────────┐    │      │     │    │   │
│  │                               │  │   │  │         SERVICE: wren-ui                │    │      │     │    │   │
│  │                               │  │   │  │  ┌─────────────┐   ┌─────────────┐       │    │      │     │    │   │
│  │                               │  │   │  │  │   Task 1    │   │   Task 2    │       │    │      │     │    │   │
│  │                               │  │   │  │  │   (AZ-a)    │   │   (AZ-b)    │       │    │      │     │    │   │
│  │                               │  │   │  │  │ Port: 3000  │   │ Port: 3000  │       │    │      │     │    │   │
│  │                               │  │   │  │  └─────────────┘   └─────────────┘       │    │      │     │    │   │
│  │                               │  │   │  └─────────────────────────────────────────┘    │      │     │    │   │
│  │                               │  │   │                         │                       │      │     │    │   │
│  │                               │  │   │  ┌─────────────────────────────────────────┐    │      │     │    │   │
│  │                               │  │   │  │      SERVICE: wren-ai-service           │    │      │     │    │   │
│  │                               │  │   │  │  ┌─────────────┐   ┌─────────────┐       │    │      │     │    │   │
│  │                               │  │   │  │  │   Task 1    │   │   Task 2    │       │    │      │     │    │   │
│  │                               │  │   │  │  │   (AZ-a)    │   │   (AZ-b)    │       │    │      │     │    │   │
│  │                               │  │   │  │  │ Port: 5555  │   │ Port: 5555  │       │    │      │     │    │   │
│  │                               │  │   │  │  └─────────────┘   └─────────────┘       │    │      │     │    │   │
│  │                               │  │   │  └─────────────────────────────────────────┘    │      │     │    │   │
│  │                               │  │   │                         │                       │      │     │    │   │
│  │                               │  │   │  ┌─────────────────────────────────────────┐    │      │     │    │   │
│  │                               │  │   │  │       SERVICE: wren-engine              │    │      │     │    │   │
│  │                               │  │   │  │  ┌─────────────┐   ┌─────────────┐       │    │      │     │    │   │
│  │                               │  │   │  │  │   Task 1    │   │   Task 2    │       │    │      │     │    │   │
│  │                               │  │   │  │  │   (AZ-a)    │   │   (AZ-b)    │       │    │      │     │    │   │
│  │                               │  │   │  │  │ Port: 8080  │   │ Port: 8080  │       │    │      │     │    │   │
│  │                               │  │   │  │  └─────────────┘   └─────────────┘       │    │      │     │    │   │
│  │                               │  │   │  └─────────────────────────────────────────┘    │      │     │    │   │
│  │                               │  │   │                         │                       │      │     │    │   │
│  │                               │  │   │  ┌─────────────────────────────────────────┐    │      │     │    │   │
│  │                               │  │   │  │        SERVICE: ibis-server             │    │      │     │    │   │
│  │                               │  │   │  │  ┌─────────────┐   ┌─────────────┐       │    │      │     │    │   │
│  │                               │  │   │  │  │   Task 1    │   │   Task 2    │       │    │      │     │    │   │
│  │                               │  │   │  │  │   (AZ-a)    │   │   (AZ-b)    │       │    │      │     │    │   │
│  │                               │  │   │  │  │ Port: 8000  │   │ Port: 8000  │       │    │      │     │    │   │
│  │                               │  │   │  │  └─────────────┘   └─────────────┘       │    │      │     │    │   │
│  │                               │  │   │  └─────────────────────────────────────────┘    │      │     │    │   │
│  │                               │  │   │                         │                       │      │     │    │   │
│  │                               │  │   │  ┌─────────────────────────────────────────┐    │      │     │    │   │
│  │                               │  │   │  │          SERVICE: qdrant                │    │      │     │    │   │
│  │                               │  │   │  │  ┌─────────────┐   ┌─────────────┐       │    │      │     │    │   │
│  │                               │  │   │  │  │   Task 1    │   │   Task 2    │       │    │      │     │    │   │
│  │                               │  │   │  │  │   (AZ-a)    │   │   (AZ-b)    │       │    │      │     │    │   │
│  │                               │  │   │  │  │ Port: 6333  │   │ Port: 6333  │       │    │      │     │    │   │
│  │                               │  │   │  │  └─────────────┘   └─────────────┘       │    │      │     │    │   │
│  │                               │  │   │  └─────────────────────────────────────────┘    │      │     │    │   │
│  │                               │  │   │                                                 │      │     │    │   │
│  │                               │  │   └─────────────────────────────────────────────────┘      │     │    │   │
│  │                               │  │                                                            │     │    │   │
│  │                               │  │   ┌─────────────────┐              ┌─────────────────┐     │     │    │   │
│  │                               │  │   │  AZ-a           │              │  AZ-b           │     │     │    │   │
│  │                               │  │   │  10.0.3.0/24    │              │  10.0.4.0/24    │     │     │    │   │
│  │                               │  │   └─────────────────┘              └─────────────────┘     │     │    │   │
│  │                               │  └────────────────────────────────────────────────────────────┘     │    │   │
│  │                               │                                                                     │    │   │
│  │                               │  ┌────────────────────────────────────────────────────────────┐     │    │   │
│  │                               │  │                    DATA SUBNETS                            │     │    │   │
│  │                               │  │                                                            │     │    │   │
│  │                               │  │   ┌─────────────────┐              ┌─────────────────┐     │     │    │   │
│  │                               │  │   │  AZ-a           │              │  AZ-b           │     │     │    │   │
│  │                               │  │   │  10.0.5.0/24    │              │  10.0.6.0/24    │     │     │    │   │
│  │                               │  │   │                 │              │                 │     │     │    │   │
│  │                               │  │   │ ┌─────────────┐ │              │ ┌─────────────┐ │     │     │    │   │
│  │                               │  │   │ │   EFS       │◄┼──────────────┼►│   EFS       │ │     │     │    │   │
│  │                               │  │   │ │ Mount Point │ │  Replicação  │ │ Mount Point │ │     │     │    │   │
│  │                               │  │   │ └─────────────┘ │              │ └─────────────┘ │     │     │    │   │
│  │                               │  │   └─────────────────┘              └─────────────────┘     │     │    │   │
│  │                               │  └────────────────────────────────────────────────────────────┘     │    │   │
│  │                               └─────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                                          │   │
│  │   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐   │   │
│  │   │                                    SERVIÇOS GERENCIADOS AWS                                      │   │   │
│  │   │                                                                                                  │   │   │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │   │
│  │   │  │   Secrets   │  │    ECR      │  │ CloudWatch  │  │  X-Ray      │  │   ACM       │              │   │   │
│  │   │  │   Manager   │  │ (Registry)  │  │ (Logs +     │  │ (Tracing)   │  │ (Cert SSL)  │              │   │   │
│  │   │  │             │  │             │  │  Metrics)   │  │             │  │             │              │   │   │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │   │
│  │   │                                                                                                  │   │   │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │   │
│  │   │  │    EFS      │  │    S3       │  │   Systems   │  │   IAM       │  │   KMS       │              │   │   │
│  │   │  │ (Storage)   │  │ (Backups)   │  │   Manager   │  │ (Roles)     │  │ (Encrypt)   │              │   │   │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │   │
│  │   └──────────────────────────────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                       INTEGRAÇÕES EXTERNAS                                              │   │
│   │                                                                                                         │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │   │
│   │  │   OpenAI    │  │   Azure     │  │  Langfuse   │  │  PostHog    │  │  Data       │                    │   │
│   │  │   API       │  │   OpenAI    │  │ (Observab.) │  │ (Analytics) │  │  Sources    │                    │   │
│   │  │             │  │   Service   │  │             │  │             │  │(PostgreSQL, │                    │   │
│   │  │             │  │             │  │             │  │             │  │ BigQuery,   │                    │   │
│   │  │             │  │             │  │             │  │             │  │ etc.)       │                    │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                    │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes da Solução

### 1. **Wren UI** (Frontend)
```yaml
Tecnologia: Next.js / React
Imagem: ghcr.io/canner/wren-ui
Porta: 3000
Recursos:
  CPU: 512 (0.5 vCPU)
  Memória: 1024 MB
Responsabilidades:
  - Interface web para usuários
  - Gerenciamento de projetos
  - Visualização de queries
  - Telemetria (PostHog)
```

### 2. **Wren AI Service** (Backend AI)
```yaml
Tecnologia: Python / FastAPI
Imagem: ghcr.io/canner/wren-ai-service
Porta: 5555
Recursos:
  CPU: 1024 (1 vCPU)
  Memória: 2048 MB
Responsabilidades:
  - Processamento de linguagem natural
  - Geração de SQL via LLM
  - Indexação e retrieval de schemas
  - Integração com OpenAI/Azure OpenAI
```

### 3. **Wren Engine** (Motor SQL)
```yaml
Tecnologia: Java / Rust
Imagem: ghcr.io/canner/wren-engine
Porta: 8080
Recursos:
  CPU: 1024 (1 vCPU)
  Memória: 2048 MB
Responsabilidades:
  - Processamento de queries SQL
  - Validação de sintaxe
  - Otimização de consultas
```

### 4. **Ibis Server** (Conectores)
```yaml
Tecnologia: Python / Ibis
Imagem: ghcr.io/canner/wren-engine-ibis
Porta: 8000
Recursos:
  CPU: 512 (0.5 vCPU)
  Memória: 1024 MB
Responsabilidades:
  - Conexão com fontes de dados
  - Tradução de queries para dialetos SQL
  - Suporte a múltiplos databases
```

### 5. **Qdrant** (Vector Database)
```yaml
Tecnologia: Rust / Qdrant
Imagem: qdrant/qdrant:v1.11.0
Porta: 6333/6334
Recursos:
  CPU: 1024 (1 vCPU)
  Memória: 2048 MB
Responsabilidades:
  - Armazenamento de embeddings
  - Busca semântica
  - Indexação de schemas
```

---

## Fluxo de Dados

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUXO DE REQUISIÇÃO                                      │
└───────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  Usuário │
    │  Browser │
    └────┬─────┘
         │
         │ HTTPS (443)
         ▼
    ┌──────────┐     ┌──────────┐
    │CloudFront│────►│   WAF    │ ◄── Proteção DDoS, Rate Limiting
    └────┬─────┘     └──────────┘
         │
         ▼
    ┌──────────┐
    │   ALB    │ ◄── TLS Termination, Health Checks
    └────┬─────┘
         │
         │ HTTP (3000)
         ▼
    ┌──────────────┐
    │   wren-ui    │ ◄── Renderização, Sessão, UI
    └────┬─────────┘
         │
         │ HTTP (5555)  ← Consultas em linguagem natural
         ▼
    ┌──────────────────┐
    │ wren-ai-service  │
    │                  │◄─────┐
    │ ┌──────────────┐ │      │
    │ │   LLM API    │─┼──────┼──► OpenAI / Azure OpenAI
    │ └──────────────┘ │      │
    │                  │      │
    │ ┌──────────────┐ │      │
    │ │  Embeddings  │─┼──────┘
    │ └──────────────┘ │
    └────┬─────────────┘
         │
         │ HTTP (6333) ← Busca vetorial
         ▼
    ┌──────────────┐
    │    qdrant    │ ◄── Vector similarity search
    └──────────────┘
         ▲
         │ Indexação de schemas
         │
    ┌────┴─────────┐
    │              │
    ▼              ▼
┌──────────┐  ┌──────────────┐
│  wren-   │  │ ibis-server  │
│  engine  │  │              │
│  (8080)  │  │    (8000)    │
└────┬─────┘  └──────┬───────┘
     │               │
     │               │ Conexão com fontes de dados
     │               ▼
     │         ┌──────────────────────────────────────┐
     │         │         FONTES DE DADOS               │
     │         │                                       │
     │         │  ┌───────┐ ┌───────┐ ┌───────┐       │
     │         │  │ Post  │ │  Big  │ │ MySQL │       │
     │         │  │greSQL │ │ Query │ │       │ ...   │
     │         │  └───────┘ └───────┘ └───────┘       │
     │         └──────────────────────────────────────┘
     │
     ▼
┌──────────────┐
│     EFS      │ ◄── Persistência de dados locais
│  (Storage)   │
└──────────────┘
```

---

## Infraestrutura AWS

### Rede (VPC)

| Componente | CIDR | Propósito |
|------------|------|-----------|
| VPC | 10.0.0.0/16 | Rede principal |
| Public Subnet AZ-a | 10.0.1.0/24 | NAT Gateway, ALB |
| Public Subnet AZ-b | 10.0.2.0/24 | NAT Gateway, ALB |
| Private Subnet AZ-a | 10.0.3.0/24 | ECS Tasks |
| Private Subnet AZ-b | 10.0.4.0/24 | ECS Tasks |
| Data Subnet AZ-a | 10.0.5.0/24 | EFS Mount |
| Data Subnet AZ-b | 10.0.6.0/24 | EFS Mount |

### ECS Fargate - Configuração de Serviços

| Serviço | Tasks Mín | Tasks Máx | vCPU | Memória | Health Check |
|---------|-----------|-----------|------|---------|--------------|
| wren-ui | 2 | 10 | 0.5 | 1GB | /api/health |
| wren-ai-service | 2 | 8 | 1.0 | 2GB | /health |
| wren-engine | 2 | 6 | 1.0 | 2GB | /health |
| ibis-server | 2 | 4 | 0.5 | 1GB | /health |
| qdrant | 2 | 4 | 1.0 | 2GB | /health |

### Auto Scaling Policies

```yaml
Target Tracking:
  - Métrica: CPUUtilization
    Target: 70%
    Scale-out cooldown: 60s
    Scale-in cooldown: 300s

  - Métrica: MemoryUtilization
    Target: 80%
    Scale-out cooldown: 60s
    Scale-in cooldown: 300s

  - Métrica: ALBRequestCountPerTarget
    Target: 1000 req/min
    Scale-out cooldown: 30s
    Scale-in cooldown: 300s
```

---

## Segurança

### Modelo de Segurança em Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 1: EDGE                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CloudFront + WAF                                       │    │
│  │  • Rate Limiting (1000 req/5min por IP)                 │    │
│  │  • Geo-blocking (opcional)                              │    │
│  │  • SQL Injection Protection                             │    │
│  │  • XSS Protection                                       │    │
│  │  • Bot Detection                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 2: TRANSPORTE                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  TLS/SSL                                                │    │
│  │  • ACM Certificate (*.nucleai.example.com)              │    │
│  │  • TLS 1.3 obrigatório                                  │    │
│  │  • HSTS habilitado                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 3: REDE                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Security Groups                                        │    │
│  │  • ALB-SG: Ingress 443 de 0.0.0.0/0                     │    │
│  │  • ECS-SG: Ingress apenas de ALB-SG                     │    │
│  │  • EFS-SG: Ingress 2049 apenas de ECS-SG                │    │
│  │  • Qdrant-SG: Ingress 6333-6334 apenas de ECS-SG        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 4: APLICAÇÃO                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  IAM Roles & Policies                                   │    │
│  │  • ECS Task Role: Acesso mínimo necessário              │    │
│  │  • ECS Execution Role: ECR, CloudWatch Logs             │    │
│  │  • Service-linked roles para cada componente            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 5: DADOS                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Secrets Management                                     │    │
│  │  • AWS Secrets Manager para API keys                    │    │
│  │  • KMS para criptografia at-rest                        │    │
│  │  • Parameter Store para configs não-sensíveis           │    │
│  │  • EFS criptografado com KMS                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Security Groups

```hcl
# ALB Security Group
alb_security_group:
  ingress:
    - port: 443
      source: 0.0.0.0/0
      description: "HTTPS from Internet"
  egress:
    - port: all
      destination: ecs_security_group
      description: "To ECS Tasks"

# ECS Security Group
ecs_security_group:
  ingress:
    - port: 3000
      source: alb_security_group
      description: "wren-ui from ALB"
    - port: 5555
      source: ecs_security_group
      description: "wren-ai-service internal"
    - port: 8080
      source: ecs_security_group
      description: "wren-engine internal"
    - port: 8000
      source: ecs_security_group
      description: "ibis-server internal"
    - port: 6333-6334
      source: ecs_security_group
      description: "qdrant internal"
  egress:
    - port: 443
      destination: 0.0.0.0/0
      description: "HTTPS to Internet (APIs)"
    - port: 2049
      destination: efs_security_group
      description: "NFS to EFS"
```

---

## Estimativa de Custos

### Custos Mensais Estimados (Região: sa-east-1)

| Componente | Especificação | Custo Estimado/Mês |
|------------|---------------|-------------------|
| **ECS Fargate** | | |
| - wren-ui | 2 tasks × 0.5 vCPU × 1GB × 730h | ~$35 |
| - wren-ai-service | 2 tasks × 1 vCPU × 2GB × 730h | ~$70 |
| - wren-engine | 2 tasks × 1 vCPU × 2GB × 730h | ~$70 |
| - ibis-server | 2 tasks × 0.5 vCPU × 1GB × 730h | ~$35 |
| - qdrant | 2 tasks × 1 vCPU × 2GB × 730h | ~$70 |
| **ALB** | Application Load Balancer | ~$25 |
| **NAT Gateway** | 2 × NAT Gateway + Data Transfer | ~$90 |
| **EFS** | 50GB Standard + IA | ~$15 |
| **CloudWatch** | Logs + Metrics | ~$20 |
| **Secrets Manager** | 5 secrets | ~$3 |
| **CloudFront** | 100GB transfer | ~$15 |
| **Route 53** | Hosted Zone + Queries | ~$5 |
| **ECR** | 10GB images | ~$1 |
| | | |
| **TOTAL ESTIMADO** | | **~$454/mês** |

### Custos Variáveis (OpenAI)

| Modelo | Preço Input | Preço Output | Estimativa (10k queries/mês) |
|--------|-------------|--------------|------------------------------|
| GPT-4.1 Nano | $0.10/1M tokens | $0.40/1M tokens | ~$50 |
| GPT-4.1 Mini | $0.40/1M tokens | $1.60/1M tokens | ~$200 |
| text-embedding-3-large | $0.13/1M tokens | - | ~$30 |

---

## Implementação

A implementação completa está disponível nos seguintes diretórios:

```
docs/architecture/
├── README.md                    # Este documento
├── ARCHITECTURE_DIAGRAM.md      # Diagrama detalhado em ASCII/Mermaid
├── terraform/                   # Infraestrutura como Código
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── vpc.tf
│   ├── ecs.tf
│   ├── alb.tf
│   ├── efs.tf
│   ├── security.tf
│   └── modules/
└── ecs-task-definitions/        # Definições de Tasks
    ├── wren-ui.json
    ├── wren-ai-service.json
    ├── wren-engine.json
    ├── ibis-server.json
    └── qdrant.json
```

---

## Próximos Passos

1. **Fase 1 - Preparação** (1 semana)
   - [ ] Criar conta AWS e configurar billing alerts
   - [ ] Configurar AWS CLI e Terraform
   - [ ] Criar repositórios ECR
   - [ ] Configurar Secrets Manager

2. **Fase 2 - Infraestrutura Base** (1 semana)
   - [ ] Deploy VPC e subnets
   - [ ] Configurar NAT Gateways
   - [ ] Deploy EFS
   - [ ] Configurar Security Groups

3. **Fase 3 - Deploy Aplicação** (1 semana)
   - [ ] Push imagens para ECR
   - [ ] Deploy ECS Cluster
   - [ ] Deploy serviços Fargate
   - [ ] Configurar ALB e health checks

4. **Fase 4 - Observabilidade** (3 dias)
   - [ ] Configurar CloudWatch Logs
   - [ ] Criar dashboards de métricas
   - [ ] Configurar alertas
   - [ ] Habilitar X-Ray tracing

5. **Fase 5 - Segurança e Produção** (3 dias)
   - [ ] Configurar WAF rules
   - [ ] Deploy CloudFront
   - [ ] Configurar certificado SSL
   - [ ] Testes de carga e segurança


# 📊 Diagramas de Arquitetura NucleAI - AWS ECS Fargate

## Diagrama de Alto Nível (Mermaid)

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        Users["👥 Usuários"]
    end

    subgraph AWS["☁️ AWS Cloud - sa-east-1"]
        subgraph Edge["Edge Layer"]
            R53["🔗 Route 53<br/>DNS"]
            CF["🌍 CloudFront<br/>CDN + Cache"]
            WAF["🛡️ WAF<br/>Web Application Firewall"]
        end

        subgraph VPC["VPC 10.0.0.0/16"]
            subgraph PublicSubnets["Public Subnets"]
                ALB["⚖️ Application<br/>Load Balancer<br/>Port: 443"]
                NAT1["🌐 NAT Gateway<br/>AZ-a"]
                NAT2["🌐 NAT Gateway<br/>AZ-b"]
            end

            subgraph PrivateSubnets["Private Subnets - ECS Fargate"]
                subgraph ECSCluster["🐳 ECS Fargate Cluster"]
                    subgraph SvcUI["Service: wren-ui"]
                        UI1["📱 Task 1<br/>Port: 3000"]
                        UI2["📱 Task 2<br/>Port: 3000"]
                    end
                    
                    subgraph SvcAI["Service: wren-ai-service"]
                        AI1["🤖 Task 1<br/>Port: 5555"]
                        AI2["🤖 Task 2<br/>Port: 5555"]
                    end
                    
                    subgraph SvcEngine["Service: wren-engine"]
                        ENG1["⚙️ Task 1<br/>Port: 8080"]
                        ENG2["⚙️ Task 2<br/>Port: 8080"]
                    end
                    
                    subgraph SvcIbis["Service: ibis-server"]
                        IBIS1["🔌 Task 1<br/>Port: 8000"]
                        IBIS2["🔌 Task 2<br/>Port: 8000"]
                    end
                    
                    subgraph SvcQdrant["Service: qdrant"]
                        QD1["🔍 Task 1<br/>Port: 6333"]
                        QD2["🔍 Task 2<br/>Port: 6333"]
                    end
                end
            end

            subgraph DataSubnets["Data Subnets"]
                EFS["💾 EFS<br/>Persistent Storage"]
            end
        end

        subgraph ManagedServices["Serviços Gerenciados"]
            ECR["📦 ECR<br/>Container Registry"]
            SM["🔐 Secrets Manager<br/>API Keys"]
            CW["📊 CloudWatch<br/>Logs & Metrics"]
            KMS["🔑 KMS<br/>Encryption"]
            ACM["📜 ACM<br/>SSL Certificates"]
        end
    end

    subgraph External["🔗 Serviços Externos"]
        OpenAI["🧠 OpenAI API"]
        Azure["☁️ Azure OpenAI"]
        Langfuse["📈 Langfuse"]
        PostHog["📊 PostHog"]
        DataSources["🗄️ Data Sources<br/>PostgreSQL, BigQuery, etc."]
    end

    Users --> R53
    R53 --> CF
    CF --> WAF
    WAF --> ALB
    ALB --> UI1 & UI2
    
    UI1 & UI2 --> AI1 & AI2
    AI1 & AI2 --> QD1 & QD2
    AI1 & AI2 --> ENG1 & ENG2
    ENG1 & ENG2 --> IBIS1 & IBIS2
    
    QD1 & QD2 --> EFS
    
    AI1 & AI2 --> NAT1 & NAT2
    NAT1 & NAT2 --> OpenAI & Azure
    
    IBIS1 & IBIS2 --> NAT1 & NAT2
    NAT1 & NAT2 --> DataSources
    
    UI1 & UI2 --> NAT1 & NAT2
    NAT1 & NAT2 --> PostHog
    
    AI1 & AI2 --> NAT1 & NAT2
    NAT1 & NAT2 --> Langfuse

    ECSCluster -.-> ECR
    ECSCluster -.-> SM
    ECSCluster -.-> CW
    SM -.-> KMS
    ALB -.-> ACM

    classDef aws fill:#FF9900,stroke:#232F3E,color:#232F3E
    classDef ecs fill:#FF9900,stroke:#232F3E,color:white
    classDef external fill:#4285F4,stroke:#1967D2,color:white
    classDef security fill:#DD4B39,stroke:#C23321,color:white
    
    class R53,CF,ALB,NAT1,NAT2,ECR,SM,CW,KMS,ACM,EFS aws
    class UI1,UI2,AI1,AI2,ENG1,ENG2,IBIS1,IBIS2,QD1,QD2 ecs
    class OpenAI,Azure,Langfuse,PostHog,DataSources external
    class WAF security
```

---

## Diagrama de Fluxo de Dados

```mermaid
sequenceDiagram
    participant U as 👤 Usuário
    participant CF as 🌍 CloudFront
    participant WAF as 🛡️ WAF
    participant ALB as ⚖️ ALB
    participant UI as 📱 wren-ui
    participant AI as 🤖 wren-ai-service
    participant QD as 🔍 Qdrant
    participant ENG as ⚙️ wren-engine
    participant IBIS as 🔌 ibis-server
    participant LLM as 🧠 OpenAI
    participant DB as 🗄️ Database

    U->>CF: HTTPS Request
    CF->>WAF: Validate Request
    WAF->>ALB: Forward if Valid
    ALB->>UI: Route to UI Service
    
    Note over U,UI: Usuário faz pergunta em linguagem natural
    
    UI->>AI: POST /v1/asks {question}
    
    AI->>QD: Search Similar Schemas
    QD-->>AI: Relevant Embeddings
    
    AI->>LLM: Generate SQL Query
    LLM-->>AI: SQL Query
    
    AI->>ENG: Validate SQL
    ENG-->>AI: Validation Result
    
    alt SQL is Valid
        AI->>ENG: Execute Query
        ENG->>IBIS: Connect to DataSource
        IBIS->>DB: Execute Native SQL
        DB-->>IBIS: Query Results
        IBIS-->>ENG: Results
        ENG-->>AI: Formatted Results
    else SQL has Errors
        AI->>LLM: Correct SQL
        LLM-->>AI: Corrected SQL
        Note over AI: Retry up to 3 times
    end
    
    AI-->>UI: Response with Results
    UI-->>ALB: JSON Response
    ALB-->>CF: Forward Response
    CF-->>U: Display Results
```

---

## Diagrama de Rede

```mermaid
graph TB
    subgraph VPC["VPC: 10.0.0.0/16"]
        subgraph AZa["Availability Zone A"]
            subgraph PubA["Public Subnet<br/>10.0.1.0/24"]
                IGW1["Internet Gateway"]
                NAT1["NAT Gateway"]
                ALB1["ALB ENI"]
            end
            
            subgraph PrivA["Private Subnet<br/>10.0.3.0/24"]
                ECS1["ECS Tasks"]
            end
            
            subgraph DataA["Data Subnet<br/>10.0.5.0/24"]
                EFS1["EFS Mount Target"]
            end
        end
        
        subgraph AZb["Availability Zone B"]
            subgraph PubB["Public Subnet<br/>10.0.2.0/24"]
                IGW2["Internet Gateway"]
                NAT2["NAT Gateway"]
                ALB2["ALB ENI"]
            end
            
            subgraph PrivB["Private Subnet<br/>10.0.4.0/24"]
                ECS2["ECS Tasks"]
            end
            
            subgraph DataB["Data Subnet<br/>10.0.6.0/24"]
                EFS2["EFS Mount Target"]
            end
        end
    end
    
    Internet((Internet)) --> IGW1 & IGW2
    IGW1 & IGW2 --> NAT1 & NAT2
    ALB1 & ALB2 --> ECS1 & ECS2
    ECS1 --> NAT1
    ECS2 --> NAT2
    ECS1 --> EFS1
    ECS2 --> EFS2
    NAT1 & NAT2 --> Internet
```

---

## Diagrama de Security Groups

```mermaid
graph LR
    subgraph Internet
        INET["0.0.0.0/0"]
    end
    
    subgraph SG_ALB["SG: alb-sg"]
        ALB["ALB<br/>:443"]
    end
    
    subgraph SG_ECS["SG: ecs-sg"]
        UI["wren-ui<br/>:3000"]
        AI["wren-ai<br/>:5555"]
        ENG["wren-engine<br/>:8080"]
        IBIS["ibis-server<br/>:8000"]
        QD["qdrant<br/>:6333"]
    end
    
    subgraph SG_EFS["SG: efs-sg"]
        EFS["EFS<br/>:2049"]
    end
    
    INET -->|"HTTPS :443"| ALB
    ALB -->|":3000"| UI
    
    UI -->|":5555"| AI
    AI -->|":6333"| QD
    AI -->|":8080"| ENG
    ENG -->|":8000"| IBIS
    
    UI & AI & ENG & IBIS & QD -->|":2049 NFS"| EFS
    
    AI & IBIS -->|":443"| INET
    
    style SG_ALB fill:#ffcccc
    style SG_ECS fill:#ccffcc
    style SG_EFS fill:#ccccff
```

---

## Diagrama de Deploy CI/CD

```mermaid
flowchart LR
    subgraph GitHub["GitHub"]
        Repo["📁 Repository"]
        Actions["⚡ GitHub Actions"]
    end
    
    subgraph AWS["AWS"]
        ECR["📦 ECR"]
        ECS["🐳 ECS Cluster"]
        
        subgraph Services["Services"]
            S1["wren-ui"]
            S2["wren-ai-service"]
            S3["wren-engine"]
            S4["ibis-server"]
            S5["qdrant"]
        end
    end
    
    Repo -->|"push"| Actions
    Actions -->|"docker build & push"| ECR
    ECR -->|"pull image"| ECS
    ECS --> S1 & S2 & S3 & S4 & S5
    
    Actions -->|"terraform apply"| AWS
```

---

## Diagrama de Monitoramento

```mermaid
flowchart TB
    subgraph ECS["ECS Fargate Cluster"]
        T1["Task 1"]
        T2["Task 2"]
        T3["Task N"]
    end
    
    subgraph Monitoring["AWS Monitoring"]
        CW["📊 CloudWatch"]
        XRay["🔍 X-Ray"]
        
        subgraph Logs["CloudWatch Logs"]
            L1["/ecs/wren-ui"]
            L2["/ecs/wren-ai-service"]
            L3["/ecs/wren-engine"]
        end
        
        subgraph Metrics["CloudWatch Metrics"]
            M1["CPU Utilization"]
            M2["Memory Utilization"]
            M3["Request Count"]
        end
        
        subgraph Alarms["CloudWatch Alarms"]
            A1["High CPU Alert"]
            A2["High Memory Alert"]
            A3["Error Rate Alert"]
        end
    end
    
    subgraph Notifications["Notificações"]
        SNS["📧 SNS"]
        Slack["💬 Slack"]
        Email["✉️ Email"]
    end
    
    T1 & T2 & T3 --> CW
    T1 & T2 & T3 --> XRay
    
    CW --> Logs
    CW --> Metrics
    Metrics --> Alarms
    Alarms --> SNS
    SNS --> Slack & Email
```

---

## Diagrama de Escalabilidade

```mermaid
graph TB
    subgraph AutoScaling["Auto Scaling Configuration"]
        subgraph Triggers["Scale Triggers"]
            CPU["CPU > 70%"]
            MEM["Memory > 80%"]
            REQ["Requests > 1000/min"]
        end
        
        subgraph Policies["Scaling Policies"]
            OUT["Scale Out<br/>+1 task<br/>Cooldown: 60s"]
            IN["Scale In<br/>-1 task<br/>Cooldown: 300s"]
        end
        
        subgraph Limits["Service Limits"]
            MIN["Min: 2 tasks"]
            MAX["Max: 10 tasks"]
            DES["Desired: 2 tasks"]
        end
    end
    
    CPU & MEM & REQ --> OUT
    CPU & MEM & REQ --> IN
    OUT & IN --> DES
    MIN --> DES
    DES --> MAX
```

---

## Diagrama de Disaster Recovery

```mermaid
flowchart TB
    subgraph Primary["Região Primária: sa-east-1"]
        subgraph AZ1["AZ sa-east-1a"]
            P1["ECS Tasks"]
            EFS1["EFS"]
        end
        
        subgraph AZ2["AZ sa-east-1b"]
            P2["ECS Tasks"]
            EFS2["EFS"]
        end
    end
    
    subgraph Backup["Backup Strategy"]
        S3["☁️ S3 Bucket<br/>Cross-Region Replication"]
        
        subgraph BackupTypes["Backup Types"]
            B1["📅 Daily Snapshots"]
            B2["📅 Weekly Backups"]
            B3["📅 Monthly Archives"]
        end
    end
    
    subgraph Recovery["Recovery Procedures"]
        R1["🔄 RTO: 4 hours"]
        R2["📊 RPO: 1 hour"]
    end
    
    EFS1 <-->|"Replication"| EFS2
    EFS1 & EFS2 --> S3
    S3 --> B1 & B2 & B3
    B1 & B2 & B3 --> R1 & R2
```

---

## Legenda de Ícones

| Ícone | Significado |
|-------|-------------|
| 👥 | Usuários |
| 🌐 | Internet/NAT Gateway |
| 🌍 | CloudFront CDN |
| 🛡️ | WAF/Segurança |
| ⚖️ | Load Balancer |
| 📱 | Interface de Usuário |
| 🤖 | Serviço de IA |
| ⚙️ | Engine de Processamento |
| 🔌 | Conector/Integração |
| 🔍 | Vector Database |
| 💾 | Armazenamento |
| 📦 | Container Registry |
| 🔐 | Secrets/Segurança |
| 📊 | Monitoramento |
| 🔑 | Criptografia |
| 📜 | Certificados |
| 🧠 | LLM/IA |
| 🗄️ | Database |

---

## Referências

- [AWS ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [WrenAI GitHub Repository](https://github.com/Canner/WrenAI)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
