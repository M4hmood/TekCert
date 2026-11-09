variable "name" {
  description = "Prefix for resource names, e.g. tekcert-dev"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR. Must be a /24 — the module splits it into eight /27s."
  type        = string
  default     = "10.0.0.0/24"

  validation {
    condition     = endswith(var.vpc_cidr, "/24")
    error_message = "vpc_cidr must be a /24 (the subnet layout assumes eight /27s)."
  }
}

variable "azs" {
  description = "Exactly two Availability Zones, e.g. [\"us-east-1a\", \"us-east-1b\"]"
  type        = list(string)

  validation {
    condition     = length(var.azs) == 2
    error_message = "Provide exactly two AZs."
  }
}

variable "enable_nat_gateway" {
  description = "Create the NAT Gateway. Turn off between sessions to save money."
  type        = bool
  default     = true
}

variable "restrict_alb_to_cloudfront" {
  description = "true = public ALB only accepts CloudFront IPs. false = open to the internet (dev only)."
  type        = bool
  default     = true
}

variable "web_port" {
  description = "Port Next.js listens on"
  type        = number
  default     = 3000
}

variable "app_port" {
  description = "Port NestJS listens on"
  type        = number
  default     = 4000
}
