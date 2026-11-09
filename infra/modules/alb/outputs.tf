output "public_alb_dns_name" {
  description = "Public ALB address. CloudFront will use it as its origin."
  value       = aws_lb.this["public"].dns_name
}

output "internal_alb_dns_name" {
  description = "Internal ALB address. Next.js uses it as API_URL (http://<this name>)."
  value       = aws_lb.this["internal"].dns_name
}

output "web_target_group_arn" {
  description = "Target group the web ASG registers its instances in"
  value       = aws_lb_target_group.this["public"].arn
}

output "app_target_group_arn" {
  description = "Target group the app ASG registers its instances in"
  value       = aws_lb_target_group.this["internal"].arn
}
