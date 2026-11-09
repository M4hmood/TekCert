variable "region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}

variable "restrict_alb_to_cloudfront" {
  type    = bool
  default = true
}

variable "web_port" {
  type    = number
  default = 3000
}

variable "app_port" {
  type    = number
  default = 4000
}

variable "existing_instance_profile_name" {
  description = "Set to \"LabInstanceProfile\" on AWS Academy Learner Lab"
  type        = string
  default     = null
}
