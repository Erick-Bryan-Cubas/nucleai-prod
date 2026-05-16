variable "aws_region" {
  description = "Região AWS para deploy"
  type        = string
  default     = "us-east-2"
}

variable "instance_type" {
  description = "Tipo de instância EC2"
  type        = string
  default     = "t3.xlarge"
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "git_repo" {
  description = "URL do repositório Git para clonar no servidor"
  type        = string
  default     = "https://github.com/Erick-Bryan-Cubas/nucleai-prod.git"
}

variable "allowed_ssh_cidr" {
  description = "CIDR permitido para SSH (seu IP). Use '0.0.0.0/0' para qualquer IP."
  type        = string
  default     = "0.0.0.0/0"
}
