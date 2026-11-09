output "vpc_id" {
  value = module.network.vpc_id
}

output "subnet_ids" {
  value = {
    public = module.network.public_subnet_ids
    web    = module.network.web_subnet_ids
    app    = module.network.app_subnet_ids
    data   = module.network.data_subnet_ids
  }
}

output "security_group_ids" {
  value = module.network.security_group_ids
}

output "asg_names" {
  value = module.compute.asg_names
}

output "nat_public_ip" {
  value = module.network.nat_public_ip
}

output "public_alb_dns_name" {
  value = module.alb.public_alb_dns_name
}

output "internal_alb_dns_name" {
  value = module.alb.internal_alb_dns_name
}
