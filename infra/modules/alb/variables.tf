variable "name" {
  description = "Prefix for resource names, e.g. tekcert-dev"
  type        = string
}

variable "vpc_id" {
  description = "VPC the target groups belong to"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets (one per AZ) for the public ALB nodes"
  type        = list(string)
}

variable "app_subnet_ids" {
  description = "App subnets (one per AZ) for the internal ALB nodes"
  type        = list(string)
}

variable "public_alb_sg_id" {
  description = "Security group of the public ALB"
  type        = string
}

variable "internal_alb_sg_id" {
  description = "Security group of the internal ALB"
  type        = string
}

variable "web_port" {
  description = "Port Next.js listens on"
  type        = number
}

variable "app_port" {
  description = "Port NestJS listens on"
  type        = number
}
