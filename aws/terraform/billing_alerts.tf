# ============================================
# Alertas de Billing — CloudWatch + SNS
# Métricas de billing só funcionam em us-east-1
# ============================================

variable "alert_email" {
  description = "Email para receber alertas de custo"
  type        = string
  default     = "datasageanalytics@gmail.com"
}

# SNS Topic em us-east-1 (obrigatório para métricas de billing)
resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1
  name     = "nucleai-billing-alerts"
}

resource "aws_sns_topic_subscription" "billing_email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Alarmes de custo — disparam quando o custo estimado mensal passa de X dólares
locals {
  billing_thresholds = [20, 40, 60, 80, 90]
}

resource "aws_cloudwatch_metric_alarm" "billing" {
  for_each = toset([for t in local.billing_thresholds : tostring(t)])

  provider = aws.us_east_1

  alarm_name          = "nucleai-billing-usd-${each.value}"
  alarm_description   = "Custo AWS estimado passou de USD $${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 86400 # 24 horas
  statistic           = "Maximum"
  threshold           = tonumber(each.value)

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]

  treat_missing_data = "notBreaching"

  tags = { Name = "nucleai-billing-${each.value}" }
}
