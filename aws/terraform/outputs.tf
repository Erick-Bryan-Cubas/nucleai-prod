output "public_ip" {
  description = "Elastic IP fixo da instância EC2"
  value       = aws_eip.nucleai.public_ip
}

output "application_url" {
  description = "URL pública para acessar o NucleAI"
  value       = "http://${aws_eip.nucleai.public_ip}:3000"
}

output "dns_setup" {
  description = "Configuração DNS no painel do seu domínio"
  value       = "Crie um registro DNS tipo A: nucleai -> ${aws_eip.nucleai.public_ip}. Após propagar (~5min), acesse http://nucleai.<seu-dominio>:3000"
}

output "ssh_command" {
  description = "Comando SSH para acessar o servidor"
  value       = "ssh -i ${path.module}/nucleai-key.pem ec2-user@${aws_eip.nucleai.public_ip}"
}

output "logs_command" {
  description = "Acompanhar logs do docker-compose"
  value       = "ssh -i ${path.module}/nucleai-key.pem ec2-user@${aws_eip.nucleai.public_ip} 'cd NucleAI/docker && docker-compose logs -f'"
}

output "init_log" {
  description = "Acompanhar o bootstrap da instância"
  value       = "ssh -i ${path.module}/nucleai-key.pem ec2-user@${aws_eip.nucleai.public_ip} 'sudo tail -f /var/log/nucleai-init.log'"
}

output "instance_id" {
  description = "ID da instância EC2"
  value       = aws_instance.nucleai.id
}

output "estimated_cost" {
  description = "Custo estimado"
  value       = "t3.xlarge us-east-2: ~$0.166/h + EIP ($0 enquanto associado) => ~$28/semana ou ~$125/mês."
}
