variable "name" {
  description = "Prefix for resource names, e.g. tekcert-dev"
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "min_size" {
  type    = number
  default = 2
}

variable "max_size" {
  type    = number
  default = 4
}

variable "web_subnet_ids" {
  type = list(string)
}

variable "app_subnet_ids" {
  type = list(string)
}

variable "web_sg_id" {
  type = string
}

variable "app_sg_id" {
  type = string
}

variable "web_port" {
  type    = number
  default = 3000
}

variable "app_port" {
  type    = number
  default = 4000
}

variable "web_target_group_arns" {
  description = "Target groups the web ASG registers its instances in"
  type        = list(string)
  default     = []
}

variable "app_target_group_arns" {
  description = "Target groups the app ASG registers its instances in"
  type        = list(string)
  default     = []
}

variable "existing_instance_profile_name" {
  description = "Use an existing instance profile instead of creating one (Learner Lab: \"LabInstanceProfile\")"
  type        = string
  default     = null
}
