# Guia de Deploy NucleAI na AWS (EC2 + Docker Compose)

Deploy do NucleAI numa instância EC2 única, gerenciada via Terraform, rodando todos os containers do projeto via `docker-compose`.

## Por que EC2 e não ECS?

A arquitetura ECS Fargate (versões anteriores deste guia) custava ~US$ 5-6/hora com a configuração mínima necessária (5 serviços com pelo menos 2 tasks cada, ALB, NAT Gateways, EFS). Para um deploy de demonstração ou avaliação, EC2 single-instance entrega o mesmo resultado funcional por **~US$ 0,17/hora** (t3.xlarge em us-east-2).

## Pré-requisitos

| Ferramenta | Versão | Como instalar |
|-----------|--------|---------------|
| AWS CLI v2 | 2.x | [Guia oficial](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| Terraform | ≥ 1.5.0 | [Download](https://www.terraform.io/downloads) |

### Configurar credenciais AWS

Você precisa de um usuário IAM com as seguintes políticas anexadas:
- `AmazonEC2FullAccess`
- `AmazonVPCFullAccess`
- `AmazonSNSFullAccess` (para alertas de billing)
- `CloudWatchFullAccess` (para alertas de billing)

Configure as credenciais localmente:

```bash
aws configure
# AWS Access Key ID: <sua-access-key>
# AWS Secret Access Key: <seu-secret>
# Default region name: us-east-2
# Default output format: json
```

Verifique:

```bash
aws sts get-caller-identity
```

## Deploy

### 1. Preparar variáveis

```bash
cd aws/terraform
cp environments/prod.tfvars.example environments/prod.tfvars
# Edite o arquivo se quiser mudar região, tipo de instância ou CIDR de SSH
```

### 2. Aplicar a infraestrutura

```bash
terraform init

terraform apply \
  -var-file=environments/prod.tfvars \
  -var="openai_api_key=sk-proj-SUA_KEY_AQUI"
```

O Terraform cria:
- 1 VPC mínima (1 subnet pública, 1 AZ)
- 1 Security Group (portas 22 SSH e 3000 HTTP abertas)
- 1 Key Pair RSA gerado localmente (salvo como `nucleai-key.pem`)
- 1 EC2 t3.xlarge com 50GB de disco gp3
- 1 Elastic IP (IP público fixo)
- 1 Tópico SNS + 5 alarmes CloudWatch de billing (US$ 20, 40, 60, 80, 90)

Após criar a instância (~30s), o `user_data` da EC2 executa em background:
1. Instala Docker e Docker Compose
2. Clona o repositório NucleAI
3. Gera `.env` completo com secrets aleatórios para Langfuse
4. Injeta a `OPENAI_API_KEY` no `.env.runtime`
5. Roda `docker-compose pull && build && up -d`

Total: ~10 minutos até a aplicação ficar acessível.

### 3. Outputs úteis

```bash
terraform output
```

Mostra:
- `application_url` — endereço público (ex: `http://3.14.92.181:3000`)
- `ssh_command` — comando pronto para SSH
- `init_log` — comando para acompanhar o bootstrap em tempo real
- `logs_command` — comando para ver logs do docker-compose

### 4. Acompanhar o bootstrap

```bash
$(terraform output -raw init_log)
# ou
ssh -i nucleai-key.pem ec2-user@<IP> "sudo tail -f /var/log/nucleai-init.log"
```

## DNS personalizado

Para acessar via `nucleai.seu-dominio.com` em vez do IP direto:

1. Pegue o Elastic IP: `terraform output -raw public_ip`
2. No painel DNS do seu provedor (Cloudflare, Route53, Oracle Cloud DNS, etc.), crie um registro tipo **A**:
   - Nome: `nucleai`
   - Tipo: `A`
   - Valor: `<EIP>`
   - TTL: 300

Após propagação (5-30 min), acesse `http://nucleai.seu-dominio.com:3000`.

## Custos estimados

| Recurso | Custo/hora | Custo/mês |
|--------|-----------|-----------|
| EC2 t3.xlarge | US$ 0,166 | ~US$ 120 |
| EBS 50GB gp3 | US$ 0,005 | ~US$ 4 |
| Elastic IP (em uso) | grátis | grátis |
| Transferência (~10 GB/mês) | US$ 0,01/GB | ~US$ 1 |
| **Total** | | **~US$ 125/mês** |

Para deploys curtos (banca, demo): **~US$ 30 por semana**.

## Alertas de billing

São criados automaticamente 5 alarmes CloudWatch que disparam um e-mail (via SNS) quando o custo estimado mensal ultrapassa US$ 20, 40, 60, 80 ou 90.

**Importante:** o e-mail de assinatura precisa ser confirmado clicando no link enviado pelo SNS na primeira execução.

## Encerrar tudo

```bash
terraform destroy \
  -var-file=environments/prod.tfvars \
  -var="openai_api_key=qualquer-valor"
```

Apaga toda a infraestrutura (EC2, EIP, VPC, alarmes). **Você não paga mais nada após o destroy.**

## Troubleshooting

### Não consigo acessar a porta 3000
- Aguarde o bootstrap completar (~10 min após `terraform apply`)
- Verifique o log: `ssh -i nucleai-key.pem ec2-user@<IP> "sudo tail -100 /var/log/nucleai-init.log"`
- Confirme que o container está rodando: `ssh -i nucleai-key.pem ec2-user@<IP> "cd NucleAI/docker && docker-compose ps"`

### SSH recusa conexão
- Verifique se seu IP atual está no `allowed_ssh_cidr` do `prod.tfvars`
- Por padrão é `0.0.0.0/0` (qualquer IP) — restrinja em produção

### terraform apply falha com "not eligible for Free Tier"
- Sua conta AWS está no AWS Free Plan. Faça upgrade para "Plano Pago" no console AWS.

### Erro de quota EC2
- Conta nova tem limite baixo de vCPUs. Solicite aumento de quota em `Service Quotas → EC2 → Running On-Demand Standard instances` (peça 16 vCPUs).
