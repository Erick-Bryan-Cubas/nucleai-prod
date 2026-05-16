#!/usr/bin/env bash
# Deploy NucleAI na AWS via Terraform (EC2 + Docker Compose)
# Uso: ./deploy.sh <OPENAI_API_KEY>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Aceita a key como argumento ou variável de ambiente
OPENAI_KEY="${1:-${OPENAI_API_KEY:-}}"
if [[ -z "$OPENAI_KEY" ]]; then
  echo "Erro: forneça a OpenAI API Key como argumento ou via OPENAI_API_KEY"
  echo "Uso: ./deploy.sh sk-proj-..."
  exit 1
fi

echo "=== Verificando AWS credentials ==="
aws sts get-caller-identity

echo "=== Inicializando Terraform ==="
terraform init -upgrade

echo "=== Validando configuração ==="
terraform validate

echo "=== Planejando deploy ==="
terraform plan \
  -var-file=environments/prod.tfvars \
  -var="openai_api_key=$OPENAI_KEY" \
  -out=tfplan

echo "=== Aplicando infraestrutura ==="
terraform apply tfplan

echo ""
echo "========================================"
echo "  URL da aplicação:"
terraform output -raw application_url
echo ""
echo "========================================"
echo ""
echo "A instância leva ~5 minutos para subir todos os containers."
echo "Para acompanhar o progresso:"
terraform output -raw init_log
echo ""
echo "Para fazer SSH:"
terraform output -raw ssh_command
