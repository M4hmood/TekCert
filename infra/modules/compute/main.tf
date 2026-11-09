###############################################################################
# Compute module — two Auto Scaling groups spanning both AZs (diagram):
#   web: Next.js  in web subnets  (min 2, max 4)
#   app: NestJS   in app subnets  (min 2, max 4)
#
# Instances boot a placeholder HTTP server on their port so you can test the
# network path end to end before any real app is deployed.
###############################################################################

# Latest Amazon Linux 2023 AMI, resolved at plan time — never hardcode AMI IDs
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  tiers = {
    web = {
      subnet_ids = var.web_subnet_ids
      sg_id      = var.web_sg_id
      port       = var.web_port
      label      = "Next.js"
      tg_arns    = var.web_target_group_arns
    }
    app = {
      subnet_ids = var.app_subnet_ids
      sg_id      = var.app_sg_id
      port       = var.app_port
      label      = "NestJS"
      tg_arns    = var.app_target_group_arns
    }
  }
}

resource "aws_launch_template" "this" {
  for_each = local.tiers

  name_prefix   = "${var.name}-${each.key}-"
  image_id      = data.aws_ssm_parameter.al2023.value
  instance_type = var.instance_type

  iam_instance_profile {
    name = local.instance_profile_name
  }

  vpc_security_group_ids = [each.value.sg_id]

  # IMDSv2 only — blocks the classic SSRF-to-credentials attack
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 8
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    port  = each.value.port
    tier  = each.key
    label = each.value.label
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.name}-${each.key}"
      Tier = each.key
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name = "${var.name}-${each.key}"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "this" {
  for_each = local.tiers

  name                = "${var.name}-asg-${each.key}"
  vpc_zone_identifier = each.value.subnet_ids
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.min_size

  launch_template {
    id      = aws_launch_template.this[each.key].id
    version = aws_launch_template.this[each.key].latest_version
  }

  # New instances register in these target groups automatically. With a target
  # group attached, "ELB" makes the ASG replace instances the ALB marks unhealthy.
  target_group_arns         = each.value.tg_arns
  health_check_type         = length(each.value.tg_arns) > 0 ? "ELB" : "EC2"
  health_check_grace_period = 120

  # Changing the launch template rolls instances one batch at a time
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.name}-${each.key}"
    propagate_at_launch = true
  }

  lifecycle {
    # Let scaling policies change desired capacity without Terraform fighting back
    ignore_changes = [desired_capacity]
  }
}
