# 🏗️ Arquitetura NucleAI - AWS ECS Fargate (v2.1)

> **Versão**: 2.1  
> **Data**: Dezembro 2025  
> **Foco**: Serverless com Otimização de Custos

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Diagrama de Arquitetura Principal](#diagrama-de-arquitetura-principal)
3. [O Que Fica em Cada Subnet?](#o-que-fica-em-cada-subnet)
4. [Fluxo Passo a Passo](#fluxo-passo-a-passo)
5. [Componentes da Solução](#componentes-da-solução)
6. [Estratégia de Rede (Cost-Optimized)](#estratégia-de-rede-cost-optimized)
7. [Fontes de Dados Suportadas](#fontes-de-dados-suportadas)
8. [Segurança](#segurança)
9. [Estimativa de Custos](#estimativa-de-custos)
10. [Changelog](#changelog)

---

## Visão Geral

O **NucleAI** é uma plataforma de Text-to-SQL com IA. Esta arquitetura foi otimizada para:

- ✅ **Serverless Verdadeiro**: ECS Fargate sem gerenciamento de servidores
- ✅ **Custo Otimizado**: Single NAT Gateway + VPC Endpoints (economia ~25%)
- ✅ **Separação de Responsabilidades**: UI como Service, Backend como Tasks
- ✅ **Oracle Database@AWS**: Suporte a databases enterprise

### Classificação dos Componentes

| Componente | Tipo ECS | Exposição | Min/Max Tasks | Justificativa |
|------------|----------|-----------|---------------|---------------|
| `wren-ui` | **Service** (Always Running) | ALB → Internet | 1-5 | Interface do usuário, precisa resposta imediata |
| `wren-ai-service` | **Service** (Always Running) | Interno | 1-4 | Processa NLP, chamado sincronamente pela UI |
| `qdrant` | **Service** (Stateful) | Interno | 1-2 | Vector DB, requer persistência em EFS |
| `wren-engine` | **Service** (Scale-to-Zero) | Interno | 0-3 | Motor SQL, pode escalar baseado em demanda |
| `ibis-server` | **Service** (Scale-to-Zero) | Interno | 0-3 | Conectores de dados, pode escalar sob demanda |

---

## Diagrama de Arquitetura Principal

```mermaid
flowchart TB
    subgraph Internet["🌐 INTERNET"]
        Users["👥 Usuários"]
    end

    subgraph Global["☁️ AWS GLOBAL (Fora da VPC)"]
        R53["🌍 Route 53<br/>DNS Global"]
        subgraph CloudFrontLayer["CloudFront Distribution"]
            CF["📡 CloudFront<br/>CDN + Cache"]
            WAF["🛡️ WAF<br/>Firewall"]
        end
    end

    subgraph Region["📍 AWS REGION: sa-east-1"]
        subgraph VPC["🔲 VPC: 10.0.0.0/16"]
            
            subgraph PublicSubnets["🟢 PUBLIC SUBNETS<br/>(Têm rota para Internet Gateway)"]
                subgraph AZa_Public["AZ-a: 10.0.1.0/24"]
                    ALB["⚖️ ALB<br/>Application Load Balancer<br/>IP Público"]
                    NAT["🚪 NAT Gateway<br/>~$45/mês"]
                end
                subgraph AZb_Public["AZ-b: 10.0.2.0/24"]
                    ALB_Node2["⚖️ ALB Node 2"]
                end
            end

            subgraph PrivateSubnets["🔵 PRIVATE SUBNETS<br/>(Sem IP público, saída via NAT)"]
                subgraph AZa_Private["AZ-a: 10.0.3.0/24"]
                    subgraph ECS["🐳 ECS FARGATE CLUSTER"]
                        UI["🌐 wren-ui<br/>Port: 3000"]
                        AI["🤖 wren-ai-service<br/>Port: 5555"]
                        Engine["⚙️ wren-engine<br/>Port: 8080"]
                        Ibis["🔌 ibis-server<br/>Port: 8000"]
                        Qdrant["🔍 qdrant<br/>Port: 6333"]
                    end
                end
                subgraph AZb_Private["AZ-b: 10.0.4.0/24"]
                    ECS_Replica["🐳 ECS Tasks<br/>(Réplicas)"]
                end
                
                subgraph VPCE["📌 VPC ENDPOINTS"]
                    S3E["S3"]
                    ECRE["ECR"]
                    LogsE["Logs"]
                    SecretsE["Secrets"]
                end
            end

            subgraph DataSubnets["🔴 DATA SUBNETS<br/>(Isoladas - Sem internet)"]
                EFS["💾 EFS<br/>Storage Persistente"]
            end
        end

        subgraph ManagedServices["🔧 AWS MANAGED SERVICES"]
            SM["🔐 Secrets Manager"]
            ECR["📦 ECR"]
            CW["📊 CloudWatch"]
            KMS["🔑 KMS"]
        end
    end

    subgraph ExternalAPIs["🌐 APIs EXTERNAS (via NAT)"]
        OpenAI["🧠 OpenAI API"]
        Langfuse["📈 Langfuse"]
    end

    subgraph DataSources["🗄️ DATA SOURCES"]
        Oracle["🔶 Oracle@AWS"]
        PostgreSQL["🐘 PostgreSQL"]
        BigQuery["☁️ BigQuery"]
        MySQL["🐬 MySQL"]
    end

    %% Fluxo de Entrada
    Users -->|1. DNS Query| R53
    R53 -->|2. Resolve para CF| CF
    CF --> WAF
    WAF -->|3. Origin Request| ALB
    ALB -->|4. Forward| UI

    %% Comunicação Interna ECS
    UI -->|Service Discovery| AI
    AI --> Engine
    AI --> Qdrant
    Engine --> Ibis

    %% Storage
    Qdrant --> EFS

    %% Saída para Internet (APIs Externas)
    AI -->|5. Via NAT| NAT
    NAT --> OpenAI
    NAT --> Langfuse

    %% Data Sources
    Ibis -->|PrivateLink| Oracle
    Ibis -->|VPC| PostgreSQL
    Ibis -->|Via NAT| BigQuery

    %% VPC Endpoints
    ECS --> VPCE
    VPCE --> ManagedServices

    %% Estilos
    classDef global fill:#ff9900,stroke:#232f3e,color:black
    classDef public fill:#7fba00,stroke:#5a8500,color:black
    classDef private fill:#0078d4,stroke:#005a9e,color:white
    classDef data fill:#e81123,stroke:#a80000,color:white
    classDef external fill:#68217a,stroke:#4b1657,color:white

    class R53,CF,WAF global
    class ALB,NAT,ALB_Node2 public
    class UI,AI,Engine,Ibis,Qdrant,ECS_Replica private
    class EFS data
    class OpenAI,Langfuse,Oracle,PostgreSQL,BigQuery,MySQL external
```

---

## O Que Fica em Cada Subnet?

### 📊 Diagrama: Componentes por Tipo de Subnet

```mermaid
flowchart LR
    subgraph Legend["📍 LEGENDA DE CORES"]
        L1["🟢 PUBLIC = Tem rota para Internet Gateway"]
        L2["🔵 PRIVATE = Sem IP público, sai via NAT"]
        L3["🔴 DATA = Isolada, sem internet"]
    end
```

```mermaid
flowchart TB
    subgraph Public["🟢 SUBNET PÚBLICA<br/>10.0.1.0/24 e 10.0.2.0/24"]
        direction TB
        P1["⚖️ <b>ALB</b><br/>Application Load Balancer<br/>─────────────────<br/>• Tem IP PÚBLICO<br/>• Recebe tráfego do CloudFront<br/>• SG: Apenas IPs do CloudFront"]
        P2["🚪 <b>NAT Gateway</b><br/>─────────────────<br/>• Tem IP PÚBLICO (Elastic IP)<br/>• Permite que Private Subnets<br/>  acessem a internet<br/>• Single AZ = ~$45/mês"]
        P3["🌐 <b>Internet Gateway</b><br/>─────────────────<br/>• Rota: 0.0.0.0/0 → IGW<br/>• Anexado à VPC"]
    end

    subgraph Private["🔵 SUBNET PRIVADA<br/>10.0.3.0/24 e 10.0.4.0/24"]
        direction TB
        PR1["🐳 <b>ECS Fargate Tasks</b><br/>─────────────────<br/>• wren-ui (Port 3000)<br/>• wren-ai-service (Port 5555)<br/>• wren-engine (Port 8080)<br/>• ibis-server (Port 8000)<br/>• qdrant (Port 6333)<br/>─────────────────<br/>• SEM IP público<br/>• Recebe tráfego do ALB<br/>• Sai via NAT Gateway"]
        PR2["📌 <b>VPC Endpoints</b><br/>─────────────────<br/>• S3 (Gateway - GRÁTIS)<br/>• ECR, Logs, Secrets (Interface)<br/>• Evita usar NAT para AWS"]
        PR3["💾 <b>EFS Mount Targets</b><br/>─────────────────<br/>• Ponto de montagem para storage<br/>• Acesso apenas interno"]
    end

    subgraph Data["🔴 DATA SUBNET<br/>10.0.5.0/24 e 10.0.6.0/24"]
        direction TB
        D1["💾 <b>EFS File System</b><br/>─────────────────<br/>• Armazenamento persistente<br/>• Usado pelo Qdrant<br/>• Sem acesso à internet"]
        D2["🗄️ <b>Banco de Dados</b><br/>(se interno à VPC)<br/>─────────────────<br/>• RDS, Aurora, etc.<br/>• Máxima isolação"]
    end

    Public --> Private
    Private --> Data

    style Public fill:#e6ffe6,stroke:#5a8500
    style Private fill:#e6f2ff,stroke:#0078d4
    style Data fill:#ffe6e6,stroke:#a80000
```

### 📋 Tabela Resumo: O Que Fica Onde?

| Subnet | Componente | Tem IP Público? | Acesso à Internet |
|--------|------------|-----------------|-------------------|
| **🟢 Pública** | ALB | ✅ Sim | ✅ Recebe (CloudFront) |
| **🟢 Pública** | NAT Gateway | ✅ Sim (EIP) | ✅ Permite saída |
| **🔵 Privada** | ECS Tasks | ❌ Não | ⬆️ Saída via NAT |
| **🔵 Privada** | VPC Endpoints | ❌ Não | 🔒 Privado (AWS) |
| **🔵 Privada** | EFS Mount | ❌ Não | ❌ Não |
| **🔴 Data** | EFS | ❌ Não | ❌ Não |
| **🔴 Data** | RDS (se houver) | ❌ Não | ❌ Não |

---

## Fluxo Passo a Passo

### 📊 Diagrama: Fluxo Completo de uma Requisição

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 Usuário
    participant R53 as 🌍 Route 53<br/>(DNS Global)
    participant CF as 📡 CloudFront<br/>+ WAF
    participant ALB as ⚖️ ALB<br/>(Public Subnet)
    participant UI as 🌐 wren-ui<br/>(Private Subnet)
    participant AI as 🤖 wren-ai-service<br/>(Private Subnet)
    participant NAT as 🚪 NAT Gateway<br/>(Public Subnet)
    participant OpenAI as 🧠 OpenAI API<br/>(Internet)
    participant Ibis as 🔌 ibis-server<br/>(Private Subnet)
    participant DB as 🗄️ PostgreSQL<br/>(Data Source)

    Note over User,R53: FASE 1: Resolução DNS
    User->>R53: 1. DNS Query: nucleai.example.com
    R53-->>User: 2. IP do CloudFront Edge mais próximo

    Note over User,ALB: FASE 2: Edge Layer (Global)
    User->>CF: 3. HTTPS Request
    CF->>CF: 4. WAF verifica (rate limit, SQLi, XSS)
    alt Request bloqueado
        CF-->>User: 403 Forbidden
    else Request permitido
        CF->>ALB: 5. Origin Request (HTTPS)
    end

    Note over ALB,UI: FASE 3: Load Balancing (VPC)
    ALB->>UI: 6. Forward para ECS Task<br/>(Port 3000)

    Note over UI,OpenAI: FASE 4: Processamento AI
    UI->>AI: 7. Chama AI Service<br/>(Service Discovery)
    AI->>NAT: 8. Precisa chamar OpenAI
    NAT->>OpenAI: 9. Request via Internet
    OpenAI-->>NAT: 10. Response
    NAT-->>AI: 11. Response
    AI-->>UI: 12. SQL Gerado

    Note over UI,DB: FASE 5: Execução SQL
    UI->>Ibis: 13. Executar SQL
    Ibis->>DB: 14. Query no banco
    DB-->>Ibis: 15. Resultados
    Ibis-->>UI: 16. Dados formatados

    Note over UI,User: FASE 6: Resposta
    UI-->>ALB: 17. Response
    ALB-->>CF: 18. Response
    CF-->>User: 19. Response (pode cachear)
```

### 🚦 Explicação Passo a Passo

#### **FASE 1: Resolução DNS (Global)**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 1 | Usuário digita `nucleai.example.com` no navegador | Cliente |
| 2 | Route 53 retorna o IP do CloudFront Edge mais próximo | Global |

#### **FASE 2: Edge Layer (Global - Fora da VPC)**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 3 | Request HTTPS chega ao CloudFront | Edge Location |
| 4 | WAF verifica rate limit, SQL injection, XSS | Edge Location |
| 5 | Se aprovado, CloudFront faz Origin Request para ALB | Edge → VPC |

#### **FASE 3: Load Balancing (Dentro da VPC)**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 6 | ALB recebe na **Public Subnet** e encaminha para ECS | VPC - Public → Private |

#### **FASE 4: Processamento AI (Private Subnet)**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 7 | wren-ui chama wren-ai-service via Service Discovery | Private Subnet |
| 8-11 | AI service precisa chamar OpenAI, sai pelo **NAT Gateway** | Private → Public → Internet |
| 12 | AI retorna o SQL gerado | Private Subnet |

#### **FASE 5: Execução da Query (Private Subnet)**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 13-16 | ibis-server conecta ao banco e executa a query | Private Subnet → Data Source |

#### **FASE 6: Resposta ao Usuário**

| Passo | Descrição | Onde Acontece |
|-------|-----------|---------------|
| 17-19 | Response volta pelo mesmo caminho | VPC → Edge → Cliente |

---

### 📊 Diagrama: Fluxo de Saída (ECS → Internet)

```mermaid
flowchart LR
    subgraph PrivateSubnet["🔵 PRIVATE SUBNET"]
        ECS["🐳 ECS Task<br/>(wren-ai-service)"]
    end

    subgraph PublicSubnet["🟢 PUBLIC SUBNET"]
        NAT["🚪 NAT Gateway<br/>Elastic IP: 54.x.x.x"]
    end

    subgraph Internet["🌐 INTERNET"]
        OpenAI["🧠 OpenAI API"]
        Langfuse["📈 Langfuse"]
    end

    ECS -->|1. Route Table:<br/>0.0.0.0/0 → NAT| NAT
    NAT -->|2. SNAT:<br/>IP Privado → Elastic IP| OpenAI
    NAT -->|2. SNAT| Langfuse

    style ECS fill:#0078d4,color:white
    style NAT fill:#7fba00,color:black
    style OpenAI fill:#68217a,color:white
    style Langfuse fill:#68217a,color:white
```

**Por que o NAT Gateway está na Public Subnet?**
- Precisa de IP público (Elastic IP) para fazer SNAT
- Route Table da Public Subnet: `0.0.0.0/0 → Internet Gateway`
- Route Table da Private Subnet: `0.0.0.0/0 → NAT Gateway`

---

### 📊 Diagrama: Fluxo para Serviços AWS (via VPC Endpoints)

```mermaid
flowchart LR
    subgraph PrivateSubnet["🔵 PRIVATE SUBNET"]
        ECS["🐳 ECS Task"]
        VPCE["📌 VPC Endpoints"]
    end

    subgraph AWSServices["🔧 AWS SERVICES (Regional)"]
        S3["📦 S3"]
        ECR["🐳 ECR"]
        Secrets["🔐 Secrets Manager"]
        Logs["📊 CloudWatch Logs"]
    end

    ECS -->|Tráfego Privado<br/>(não usa NAT)| VPCE
    VPCE --> S3
    VPCE --> ECR
    VPCE --> Secrets
    VPCE --> Logs

    style ECS fill:#0078d4,color:white
    style VPCE fill:#0078d4,color:white
    style S3 fill:#ff9900,color:black
    style ECR fill:#ff9900,color:black
```

**Economia**: VPC Endpoints evitam uso do NAT Gateway para serviços AWS = **menos custo**

---

## Estratégia de Rede (Cost-Optimized)

### ⚠️ Problema: NAT Gateway Custoso

Na v1, usávamos **2 NAT Gateways** (um por AZ), custando ~$90/mês.

### ✅ Solução: Single NAT Gateway + VPC Endpoints

```mermaid
flowchart TB
    subgraph V1["❌ v1: 2 NAT Gateways (~$90/mês)"]
        direction TB
        subgraph AZa1["AZ-a"]
            NAT1["🚪 NAT GW 1"]
            ECS1["🐳 ECS"]
        end
        subgraph AZb1["AZ-b"]
            NAT2["🚪 NAT GW 2"]
            ECS2["🐳 ECS"]
        end
        ECS1 --> NAT1
        ECS2 --> NAT2
    end

    subgraph V2["✅ v2: 1 NAT Gateway (~$45/mês)"]
        direction TB
        subgraph AZa2["AZ-a"]
            NAT3["🚪 NAT GW<br/>(Single)"]
            ECS3["🐳 ECS"]
        end
        subgraph AZb2["AZ-b"]
            ECS4["🐳 ECS"]
        end
        ECS3 --> NAT3
        ECS4 -->|Cross-AZ| NAT3
    end

    style V1 fill:#ffe6e6
    style V2 fill:#e6ffe6
```

### VPC Endpoints: Eliminar Dependência do NAT

```mermaid
flowchart LR
    subgraph ECS["🐳 ECS Tasks"]
        Task["Task"]
    end

    subgraph VPCE["📌 VPC Endpoints"]
        S3["S3<br/>Gateway<br/>GRÁTIS"]
        ECR["ECR<br/>Interface<br/>~$7/mês"]
        Logs["Logs<br/>Interface<br/>~$7/mês"]
        Secrets["Secrets<br/>Interface<br/>~$7/mês"]
    end

    subgraph NAT["🚪 NAT Gateway"]
        NATgw["~$45/mês"]
    end

    subgraph External["🌐 APIs Externas"]
        OpenAI["OpenAI"]
        Langfuse["Langfuse"]
    end

    Task -->|AWS Services| S3
    Task -->|AWS Services| ECR
    Task -->|AWS Services| Logs
    Task -->|AWS Services| Secrets
    Task -->|Apenas APIs externas| NATgw
    NATgw --> OpenAI
    NATgw --> Langfuse

    style S3 fill:#7fba00,color:black
    style ECR fill:#0078d4,color:white
    style Logs fill:#0078d4,color:white
    style Secrets fill:#0078d4,color:white
    style NATgw fill:#ff9900,color:black
```

| Endpoint | Tipo | Custo | Finalidade |
|----------|------|-------|------------|
| **S3** | Gateway | **GRATUITO** | Backups, logs, artifacts |
| **ECR API** | Interface | ~$7/mês | Pull de imagens |
| **ECR DKR** | Interface | ~$7/mês | Docker registry |
| **CloudWatch Logs** | Interface | ~$7/mês | Envio de logs |
| **Secrets Manager** | Interface | ~$7/mês | Acesso a secrets |
| **EFS** | Interface | ~$7/mês | Mount points |

**Total VPC Endpoints**: ~$35/mês

**Uso do NAT Gateway (Single)**: Apenas para APIs externas (OpenAI, Langfuse, BigQuery, etc.)

---

## Componentes da Solução

### Classificação por Tipo de Workload

```mermaid
flowchart TB
    subgraph AlwaysOn["🟢 SERVICES - Always Running"]
        direction TB
        UI["🌐 <b>wren-ui</b><br/>────────────<br/>Port: 3000<br/>0.5 vCPU, 1GB<br/>Min: 1, Max: 5<br/>────────────<br/>Exposto ao ALB"]
        AI["🤖 <b>wren-ai-service</b><br/>────────────<br/>Port: 5555<br/>1 vCPU, 2GB<br/>Min: 1, Max: 4<br/>────────────<br/>Chama OpenAI via NAT"]
        QD["🔍 <b>qdrant</b><br/>────────────<br/>Port: 6333<br/>1 vCPU, 2GB<br/>Min: 1, Max: 2<br/>────────────<br/>STATEFUL (EFS)"]
    end

    subgraph ScaleZero["⚡ SERVICES - Scale-to-Zero"]
        direction TB
        Engine["⚙️ <b>wren-engine</b><br/>────────────<br/>Port: 8080<br/>1 vCPU, 2GB<br/>Min: 0, Max: 3<br/>────────────<br/>Cold Start: ~30s"]
        Ibis["🔌 <b>ibis-server</b><br/>────────────<br/>Port: 8000<br/>0.5 vCPU, 1GB<br/>Min: 0, Max: 3<br/>────────────<br/>Cold Start: ~15s"]
    end

    ALB["⚖️ ALB"]
    EFS["💾 EFS"]
    DS["🗄️ Data Sources"]

    ALB --> UI
    UI --> AI
    AI --> QD
    AI --> Engine
    Engine --> Ibis
    Ibis --> DS
    QD --> EFS

    style AlwaysOn fill:#e6ffe6,stroke:#5a8500
    style ScaleZero fill:#fff3e6,stroke:#ff9900
```

### Tabela de Componentes

| Componente | Tipo | Port | Recursos | Scaling | Justificativa |
|------------|------|------|----------|---------|---------------|
| `wren-ui` | Always Running | 3000 | 0.5 vCPU, 1GB | 1-5 | Frontend, SLA < 200ms |
| `wren-ai-service` | Always Running | 5555 | 1 vCPU, 2GB | 1-4 | NLP síncrono, chama OpenAI |
| `qdrant` | Stateful | 6333 | 1 vCPU, 2GB | 1-2 | Vector DB, requer EFS |
| `wren-engine` | Scale-to-Zero | 8080 | 1 vCPU, 2GB | 0-3 | Processa queries sob demanda |
| `ibis-server` | Scale-to-Zero | 8000 | 0.5 vCPU, 1GB | 0-3 | Conectores de dados |

> ⚠️ **Nota sobre Scale-to-Zero**: ECS Fargate não suporta nativamente. Use Application Auto Scaling com min=0 (cold start de ~30s) ou mantenha min=1 para latência garantida (~$20/mês extra).

---

## Fontes de Dados Suportadas

### 📊 Diagrama: Conectividade com Data Sources

```mermaid
flowchart TB
    subgraph VPC["🔲 VPC NucleAI"]
        Ibis["🔌 ibis-server<br/>(Private Subnet)"]
    end

    subgraph InternalDS["🏢 DATA SOURCES INTERNOS (VPC)"]
        Aurora["🐘 Aurora PostgreSQL<br/>VPC Peering"]
        RDS["🐬 MySQL RDS<br/>VPC"]
        Redshift["📊 Redshift<br/>VPC Endpoint"]
    end

    subgraph OracleAWS["🔶 ORACLE DATABASE@AWS"]
        Oracle["🔶 Oracle Exadata<br/>PrivateLink"]
    end

    subgraph ExternalDS["🌐 DATA SOURCES EXTERNOS (via NAT)"]
        BigQuery["☁️ BigQuery<br/>Google Cloud"]
        Snowflake["❄️ Snowflake<br/>Multi-cloud"]
    end

    subgraph NAT["🚪 NAT Gateway"]
        NATgw["Public Subnet"]
    end

    Ibis -->|< 5ms| Aurora
    Ibis -->|< 5ms| RDS
    Ibis -->|< 5ms| Redshift
    Ibis -->|PrivateLink < 5ms| Oracle
    Ibis --> NATgw
    NATgw -->|50-200ms| BigQuery
    NATgw -->|50-200ms| Snowflake

    style VPC fill:#e6f2ff,stroke:#0078d4
    style InternalDS fill:#e6ffe6,stroke:#5a8500
    style OracleAWS fill:#fff3e6,stroke:#ff9900
    style ExternalDS fill:#ffe6e6,stroke:#e81123
```

### Matriz Completa de Data Sources

| Categoria | Data Source | Conexão | Latência | Observações |
|-----------|-------------|---------|----------|-------------|
| **Enterprise** | Oracle Database@AWS | PrivateLink | <5ms | Full Oracle, Exadata |
| **Enterprise** | Oracle RDS | VPC | <5ms | Managed Oracle na AWS |
| **Cloud DW** | BigQuery | Internet (NAT) | 50-200ms | Google Cloud |
| **Cloud DW** | Snowflake | Internet (NAT) | 50-200ms | Multi-cloud |
| **Cloud DW** | Redshift | VPC | <5ms | AWS nativo |
| **Open Source** | PostgreSQL (Aurora) | VPC | <5ms | Serverless v2 |
| **Open Source** | MySQL (Aurora) | VPC | <5ms | Cost-effective |
| **Microsoft** | SQL Server (RDS) | VPC | <5ms | Enterprise |
| **Embedded** | DuckDB | Local (EFS) | <1ms | Analytics in-process |

### Oracle Database@AWS

**O que é**: Oracle Database rodando diretamente em infraestrutura AWS, com hardware Oracle dedicado (Exadata) e 100% compatibilidade.

**Benefícios**:
- ✅ Hardware dedicado Oracle (Exadata)
- ✅ 100% compatibilidade com Oracle on-premise
- ✅ Features avançados: RAC, Data Guard, RMAN
- ✅ Conectividade via AWS PrivateLink (<5ms)

**Configuração no ibis-server**:

```yaml
connection:
  type: oracle
  host: oracle-odb.xxxxx.sa-east-1.aws.oracle.com
  port: 1521
  service_name: ORCL
  credentials:
    username: ${ORACLE_USER}
    password: ${ORACLE_PASSWORD}  # via Secrets Manager
```

---

## Segurança

### Modelo de Segurança em Camadas

```mermaid
flowchart TB
    subgraph Layer1["🛡️ LAYER 1: EDGE SECURITY"]
        direction LR
        CF["CloudFront + WAF"]
        Shield["AWS Shield<br/>(DDoS)"]
        Rules["Managed Rules<br/>SQLi, XSS, Bots"]
    end

    subgraph Layer2["🔒 LAYER 2: NETWORK ISOLATION"]
        direction LR
        VPC["VPC"]
        SG["Security Groups"]
        NACL["NACLs"]
        VPCE["VPC Endpoints"]
    end

    subgraph Layer3["👤 LAYER 3: IDENTITY & ACCESS"]
        direction LR
        IAM["IAM Roles<br/>Least Privilege"]
        SM["Secrets Manager"]
        KMS["KMS Keys"]
    end

    subgraph Layer4["🔐 LAYER 4: DATA PROTECTION"]
        direction LR
        TLS["TLS 1.3<br/>In Transit"]
        ENC["Encryption<br/>At Rest"]
        Audit["CloudTrail<br/>Audit Logs"]
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4

    style Layer1 fill:#ff9900,color:black
    style Layer2 fill:#0078d4,color:white
    style Layer3 fill:#7fba00,color:black
    style Layer4 fill:#68217a,color:white
```

### Security Groups (Fluxo)

```mermaid
flowchart TB
    CF["🌐 CloudFront<br/>(AWS IPs)"]
    
    subgraph VPC["VPC"]
        ALB["⚖️ sg-alb<br/>Port: 443<br/>────────<br/>Ingress: CloudFront IPs"]
        ECS_UI["🌐 sg-ecs-ui<br/>Port: 3000<br/>────────<br/>Ingress: sg-alb"]
        ECS_Internal["🔧 sg-ecs-internal<br/>Ports: 5555, 8080, 8000, 6333<br/>────────<br/>Ingress: sg-ecs-ui"]
        EFS_SG["💾 sg-efs<br/>Port: 2049<br/>────────<br/>Ingress: sg-ecs-internal"]
    end

    CF -->|HTTPS 443| ALB
    ALB -->|HTTP 3000| ECS_UI
    ECS_UI -->|Internal| ECS_Internal
    ECS_Internal -->|NFS 2049| EFS_SG

    style CF fill:#ff9900,color:black
    style ALB fill:#7fba00,color:black
    style ECS_UI fill:#0078d4,color:white
    style ECS_Internal fill:#0078d4,color:white
    style EFS_SG fill:#e81123,color:white
```

### Tabela de Security Groups

| Security Group | Porta | Ingress | Descrição |
|----------------|-------|---------|-----------|
| `sg-alb` | 443 | CloudFront Prefix List | ALB aceita apenas CloudFront |
| `sg-ecs-ui` | 3000 | sg-alb | wren-ui recebe do ALB |
| `sg-ecs-internal` | 5555, 8080, 8000, 6333 | sg-ecs-ui | Services internos |
| `sg-efs` | 2049 | sg-ecs-internal | EFS aceita apenas ECS |

---

## Estimativa de Custos

### Comparação v1 vs v2

```mermaid
flowchart LR
    subgraph V1["❌ v1 Original: ~$479/mês"]
        direction TB
        V1_ECS["ECS: $280<br/>• 2 tasks por service"]
        V1_NAT["NAT: $90<br/>• 2 NAT Gateways"]
        V1_Other["Outros: $109"]
    end

    subgraph V2["✅ v2 Otimizado: ~$359/mês"]
        direction TB
        V2_ECS["ECS: $185<br/>• Scale-to-zero"]
        V2_NAT["NAT: $45<br/>• 1 NAT Gateway"]
        V2_VPCE["VPC Endpoints: $35"]
        V2_Other["Outros: $94"]
    end

    V1 -->|"💰 -$120/mês<br/>(25% economia)"| V2

    style V1 fill:#ffe6e6,stroke:#e81123
    style V2 fill:#e6ffe6,stroke:#5a8500
```

### Detalhamento v2 (Otimizado)

| Componente | Configuração | Custo/Mês | Notas |
|------------|--------------|-----------|-------|
| **ECS Fargate** | | | |
| └ wren-ui | 0.5 vCPU, 1GB, avg 1.5 tasks | ~$25 | Always running |
| └ wren-ai-service | 1 vCPU, 2GB, avg 1.5 tasks | ~$55 | Always running |
| └ wren-engine | 1 vCPU, 2GB, avg 1 task | ~$35 | Scale on demand |
| └ ibis-server | 0.5 vCPU, 1GB, avg 1 task | ~$20 | Scale on demand |
| └ qdrant | 1 vCPU, 2GB, 1 task | ~$50 | Stateful |
| **Rede** | | | |
| └ NAT Gateway | 1x (single AZ) | ~$45 | External APIs only |
| └ VPC Endpoints | 5 interface endpoints | ~$35 | AWS services |
| └ Data Transfer | ~50GB | ~$10 | Cross-AZ + external |
| **Load Balancer** | | | |
| └ ALB | 1 ALB, multi-AZ | ~$25 | Fixed cost |
| **Storage** | | | |
| └ EFS | 50GB, IA enabled | ~$15 | Qdrant persistence |
| **Observability** | | | |
| └ CloudWatch | Logs + Metrics | ~$15 | Optimized retention |
| **Edge** | | | |
| └ CloudFront | 100GB transfer | ~$15 | CDN + Cache |
| └ Route 53 | 1 hosted zone | ~$5 | DNS |
| └ WAF | 3 managed rules | ~$5 | Security |
| **Security** | | | |
| └ Secrets Manager | 5 secrets | ~$2 | API keys |
| └ ACM | 1 certificate | ~$0 | Free with CloudFront |
| └ ECR | 10GB images | ~$2 | Container registry |
| | | | |
| **TOTAL** | | **~$359/mês** | |

---

## Changelog

### v1 → v2.1

| Aspecto | v1 (Original) | v2.1 (Revisado) | Impacto |
|---------|---------------|-----------------|---------|
| **NAT Gateway** | 2 (dual-AZ) | 1 (single-AZ) + VPC Endpoints | -$45/mês |
| **Edge Layer** | Route53 → CloudFront → WAF | Route53 → CloudFront+WAF | Correção conceitual |
| **wren-ui** | Service (min 2) | Service (min 1, ALB exposed) | Clareza, -$10/mês |
| **wren-engine** | Service (min 2) | Service (min 0, scale-to-zero) | -$35/mês |
| **ibis-server** | Service (min 2) | Service (min 0, scale-to-zero) | -$15/mês |
| **qdrant** | Service | Service (stateful, EFS) | Clareza |
| **Oracle@AWS** | Não mencionado | Adicionado como data source | Feature |
| **Diagramas** | ASCII Art | Mermaid | Melhor visualização |
| **Custo Total** | ~$479/mês | ~$359/mês | **-25%** |

---

## Próximos Passos

1. ✅ **Arquitetura Revisada** - Documentação atualizada com Mermaid
2. ⏳ **Atualizar Terraform** - Single NAT + VPC Endpoints
3. ⏳ **Configurar Scale-to-Zero** - wren-engine e ibis-server
4. ⏳ **Testar Oracle@AWS** - Conectividade via PrivateLink
5. ⏳ **Validar Cold Start** - Tempo aceitável para scale-to-zero

---

## Referências

- [Oracle Database@AWS](https://www.oracle.com/cloud/aws/)
- [VPC Endpoints Pricing](https://aws.amazon.com/privatelink/pricing/)
- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [NAT Gateway Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [CloudFront + WAF Integration](https://docs.aws.amazon.com/waf/latest/developerguide/cloudfront-features.html)
- [ECS Application Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
