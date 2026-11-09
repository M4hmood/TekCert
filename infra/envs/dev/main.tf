locals {
  name = "tekcert-${var.environment}"
}

module "network" {
  source = "../../modules/network"

  name                       = local.name
  vpc_cidr                   = "10.0.0.0/24"
  azs                        = var.azs
  enable_nat_gateway         = var.enable_nat_gateway
  restrict_alb_to_cloudfront = var.restrict_alb_to_cloudfront
  web_port                   = var.web_port
  app_port                   = var.app_port
}

module "alb" {
  source = "../../modules/alb"

  name               = local.name
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  app_subnet_ids     = module.network.app_subnet_ids
  public_alb_sg_id   = module.network.security_group_ids["alb_public"]
  internal_alb_sg_id = module.network.security_group_ids["alb_internal"]
  web_port           = var.web_port
  app_port           = var.app_port
}

module "compute" {
  source = "../../modules/compute"

  name          = local.name
  instance_type = "t3.micro"
  min_size      = 2
  max_size      = 4

  web_subnet_ids = module.network.web_subnet_ids
  app_subnet_ids = module.network.app_subnet_ids
  web_sg_id      = module.network.security_group_ids["web"]
  app_sg_id      = module.network.security_group_ids["app"]
  web_port       = var.web_port
  app_port       = var.app_port

  web_target_group_arns = [module.alb.web_target_group_arn]
  app_target_group_arns = [module.alb.app_target_group_arn]

  existing_instance_profile_name = var.existing_instance_profile_name
}
