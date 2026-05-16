# ============================================
# VPC mínima — 1 subnet pública, 1 AZ
# ============================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = local.az
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ============================================
# Security Group — SSH + porta 3000 pública
# ============================================

resource "aws_security_group" "nucleai" {
  name        = "${local.name_prefix}-sg"
  description = "NucleAI EC2 security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "NucleAI UI"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-sg" }
}

# ============================================
# Key Pair — gerado pelo Terraform
# ============================================

resource "tls_private_key" "nucleai" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "nucleai" {
  key_name   = "${local.name_prefix}-key"
  public_key = tls_private_key.nucleai.public_key_openssh

  tags = { Name = "${local.name_prefix}-key" }
}

resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.nucleai.private_key_pem
  filename        = "${path.module}/nucleai-key.pem"
  file_permission = "0600"
}

# ============================================
# Secrets gerados pelo Terraform
# ============================================

resource "random_password" "langfuse_salt" {
  length  = 32
  special = false
}

resource "random_password" "langfuse_encryption_key" {
  length  = 64
  special = false
  upper   = false
}

resource "random_password" "langfuse_nextauth_secret" {
  length  = 32
  special = false
}

resource "random_uuid" "user_uuid" {}

# ============================================
# User Data — bootstrap da instância
# Embute config.yaml e gera .env completo
# ============================================

locals {
  config_yaml = file("${path.module}/../../docker/config.yaml")

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail
    exec > >(tee /var/log/nucleai-init.log) 2>&1

    echo "=== [1/7] Atualizando sistema ==="
    dnf update -y

    echo "=== [2/7] Instalando Docker e Git ==="
    dnf install -y docker git
    systemctl enable --now docker
    usermod -aG docker ec2-user

    echo "=== [3/7] Instalando Docker Compose v2 ==="
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest \
      | grep '"tag_name"' | cut -d'"' -f4)
    curl -fsSL \
      "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    echo "=== [4/7] Clonando repositório ==="
    cd /home/ec2-user
    sudo -u ec2-user git clone ${var.git_repo} NucleAI
    cd /home/ec2-user/NucleAI/docker

    echo "=== [5/7] Gravando config.yaml ==="
    cat > config.yaml <<'CONFIGEOF'
${local.config_yaml}
CONFIGEOF

    echo "=== [6/7] Gerando .env completo ==="
    cat > .env <<'ENVEOF'
COMPOSE_PROJECT_NAME=wrenai
PLATFORM=linux/amd64
PROJECT_DIR=/home/ec2-user/NucleAI/docker
LOCAL_STORAGE=/home/ec2-user/NucleAI/docker

# service ports
WREN_ENGINE_PORT=8080
WREN_ENGINE_SQL_PORT=7432
WREN_AI_SERVICE_PORT=5555
WREN_UI_PORT=3000
IBIS_SERVER_PORT=8000
IBIS_SERVER_FORWARD_PORT=8000
ENGINE_FORWARD_PORT=8080
ENGINE_SQL_FORWARD_PORT=7432
WREN_UI_ENDPOINT=http://wren-ui:3000
HOST_PORT=3000
AI_SERVICE_FORWARD_PORT=5555

# ai service
QDRANT_HOST=qdrant
SHOULD_FORCE_DEPLOY=0
NUCLEAI_SKIP_REINDEX_DEFAULT=false
GENERATION_MODEL=gpt-4o-mini

# versions
WREN_PRODUCT_VERSION=0.29.0
WREN_ENGINE_VERSION=latest
WREN_AI_SERVICE_VERSION=latest
IBIS_SERVER_VERSION=latest
WREN_UI_VERSION=custom
WREN_BOOTSTRAP_VERSION=0.1.5
QDRANT_VERSION=latest

# telemetry
USER_UUID=${random_uuid.user_uuid.result}
POSTHOG_API_KEY=phc_nhF32aj4xHXOZb0oqr2cn4Oy9uiWzz6CCP4KZmRq9aE
POSTHOG_HOST=https://app.posthog.com
TELEMETRY_ENABLED=true

# Langfuse infra secrets (gerados pelo Terraform)
LANGFUSE_SALT=${random_password.langfuse_salt.result}
LANGFUSE_ENCRYPTION_KEY=${random_password.langfuse_encryption_key.result}
LANGFUSE_NEXTAUTH_SECRET=${random_password.langfuse_nextauth_secret.result}
LANGFUSE_NEXTAUTH_URL=http://localhost:3100
LANGFUSE_POSTGRES_PASSWORD=postgres
LANGFUSE_CLICKHOUSE_PASSWORD=clickhouse
LANGFUSE_REDIS_AUTH=myredissecret
LANGFUSE_MINIO_USER=minio
LANGFUSE_MINIO_PASSWORD=miniosecret

# Langfuse bootstrap admin
LANGFUSE_INIT_USER_EMAIL=admin@nucleai.local
LANGFUSE_INIT_USER_NAME=NucleAI Admin
LANGFUSE_INIT_USER_PASSWORD=changeme

# Langfuse project keys (preenchidos via UI/bootstrap)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=

# wren-ui
EXPERIMENTAL_ENGINE_RUST_VERSION=false
ENVEOF

    cat > .env.runtime <<'RUNTIMEEOF'
OPENAI_API_KEY=${var.openai_api_key}
RUNTIMEEOF

    chown -R ec2-user:ec2-user /home/ec2-user/NucleAI

    echo "=== [7/7] Subindo containers (5-10 min) ==="
    sudo -u ec2-user bash -lc "
      cd /home/ec2-user/NucleAI/docker && \
      /usr/local/bin/docker-compose pull --ignore-pull-failures && \
      /usr/local/bin/docker-compose build wren-ui && \
      /usr/local/bin/docker-compose up -d
    "

    echo "=== Deploy concluido ==="
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "Acesse: http://$PUBLIC_IP:3000"
  EOF
}

# ============================================
# EC2 Instance
# ============================================

resource "aws_instance" "nucleai" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.nucleai.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.nucleai.id]

  user_data                   = local.user_data
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = { Name = "${local.name_prefix}-server" }
}

# ============================================
# Elastic IP — IP fixo para DNS
# ============================================

resource "aws_eip" "nucleai" {
  instance = aws_instance.nucleai.id
  domain   = "vpc"

  tags = { Name = "${local.name_prefix}-eip" }

  depends_on = [aws_internet_gateway.main]
}
