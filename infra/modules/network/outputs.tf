output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = local.subnet_ids_by_tier["public"]
}

output "web_subnet_ids" {
  value = local.subnet_ids_by_tier["web"]
}

output "app_subnet_ids" {
  value = local.subnet_ids_by_tier["app"]
}

output "data_subnet_ids" {
  value = local.subnet_ids_by_tier["data"]
}

output "security_group_ids" {
  value = {
    alb_public   = aws_security_group.alb_public.id
    web          = aws_security_group.web.id
    alb_internal = aws_security_group.alb_internal.id
    app          = aws_security_group.app.id
    db           = aws_security_group.db.id
  }
}

output "nat_public_ip" {
  value = var.enable_nat_gateway ? aws_eip.nat[0].public_ip : null
}
